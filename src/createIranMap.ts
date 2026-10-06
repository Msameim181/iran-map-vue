import {
  computed,
  defineComponent,
  getCurrentInstance,
  h,
  markRaw,
  onActivated,
  onBeforeUnmount,
  onDeactivated,
  onMounted,
  ref,
  toRaw,
  watch,
  withMemo,
} from 'vue'
import type { VNode } from 'vue'
import {
  SELECTABLE_ELEMENT_SELECTOR,
  buildMapModel,
  getAreaFill,
  getAreaTestId,
  getAreaTooltip,
  getCapitalMarkerGeometry,
  getCapitalTestId,
  getCapitalTooltip,
  getDeselectProvince,
  getIslandFill,
  getIslandTestId,
  getIslandTooltip,
  getLabelMetrics,
  getLabeledWaterBodies,
  getProvinceLabelAreas,
  iranMapDefaults,
  resolveAreaSelection,
  resolveDefaultSelectedArea,
  resolveSelectedAreaColor,
  toPublicArea,
  toPublicIsland,
} from '@msameim181/iran-map-core'
import type { IranMapCatalogs, RenderableMapArea } from '@msameim181/iran-map-core'
import { warnOnce } from './devWarn.js'
import { hasListener } from './listeners.js'
import { iranMapEmits, iranMapProps } from './props.js'
import { createTooltip } from './tooltip.js'
import type { Tooltip } from './tooltip.js'

const interactiveOf = (target: EventTarget | null): Element | null => {
  const node = target as Node | null
  const element = node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null)
  return element?.closest(SELECTABLE_ELEMENT_SELECTOR) ?? null
}

const stroke = { 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-miterlimit': 1 }
const CATALOG_KEYS = [
  'provinces',
  'counties',
  'islands',
  'waterBodies',
  'provinceCapitals',
  'countyCapitals',
] as const satisfies ReadonlyArray<keyof IranMapCatalogs>

/**
 * Builds an IranMap component bound to default catalogs. The root entry binds the lean
 * (provinces-only) set and `/full` binds everything, so both share this one implementation.
 */
export const createIranMap = (defaults: IranMapCatalogs) => {
  const lean = markRaw({ ...defaults })

  return defineComponent({
    name: 'IranMap',
    props: iranMapProps,
    emits: iranMapEmits,
    setup(props, { emit }) {
      const instance = getCurrentInstance()!

      // Catalogs are multi-MB: never let Vue proxy them. Fields are read through the (possibly
      // reactive) container so replacing one is tracked, each array is un-proxied, an explicit
      // `undefined` keeps the default, and an unchanged field set returns the previous object so
      // an inline `:catalogs="{ counties }"` does not rebuild the model.
      let previous: IranMapCatalogs | undefined
      const catalogs = computed<IranMapCatalogs>(() => {
        const overrides = props.catalogs
        if (!overrides) return lean
        const merged = { ...lean } as Record<string, unknown>
        for (const key of CATALOG_KEYS) {
          const value = overrides[key]
          if (value !== undefined) merged[key] = toRaw(value)
        }
        const next = merged as unknown as IranMapCatalogs
        if (previous && CATALOG_KEYS.every((key) => previous![key] === next[key])) return previous
        return (previous = markRaw(next))
      })

      const model = computed(() => {
        const result = buildMapModel(
          {
            data: props.data,
            colorRange: props.colorRange,
            colorBands: props.colorBands,
            mode: props.mode,
            regions: props.regions,
            detailedCounties: props.detailedCounties,
            focusProvince: props.focusProvince,
            focusPadding: props.focusPadding,
            regionAggregation: props.regionAggregation,
            deactiveProvinceColor: props.deactiveProvinceColor,
            capitalMarkers: props.capitalMarkers,
            showIslands: props.showIslands,
            showWater: props.showWater,
            showLabels: props.showLabels,
          },
          catalogs.value,
        )
        for (const warning of result.warnings) {
          warnOnce(
            `${warning}. Import IranMap from '@msameim181/iran-map-vue/full' (or /lite) or pass the catalog via the \`catalogs\` prop.`,
          )
        }
        return result
      })
      // Lookups for delegated events (ids are unique per layer).
      const islandsById = computed(() => new Map(model.value.islands.map((island) => [island.id, island])))
      const capitalsById = computed(() => new Map(model.value.capitals.map((capital) => [capital.id, capital])))

      // --- selection (uncontrolled by default; controlled when `selectedArea` is not undefined) ---
      const inner = ref<string | undefined>(resolveDefaultSelectedArea(props))
      const selectedId = computed(() =>
        props.selectedArea !== undefined ? (props.selectedArea ?? undefined) : inner.value,
      )
      watch(
        () => props.selectedArea,
        (next, before) => {
          if (before !== undefined && next === undefined) {
            warnOnce(
              'selectedArea switched from controlled to uncontrolled (it became undefined); use null for "nothing selected". The map falls back to its internal selection.',
            )
          }
        },
      )
      const setSelected = (id: string | undefined) => {
        inner.value = id
        emit('update:selectedArea', id ?? null)
      }
      const clearSelection = () => {
        const id = selectedId.value
        if (id === undefined) return
        const province = getDeselectProvince(catalogs.value.provinces, id)
        setSelected(undefined)
        emit('deselect')
        emit('hover', null)
        if (province) emit('select-province', province)
      }
      const handleSelect = (area: RenderableMapArea, toggle = true) => {
        const result = resolveAreaSelection(selectedId.value, area, toggle)
        if (result.action === 'deselect') return clearSelection()
        setSelected(result.selectedId)
        emit('select', result.area)
        if (result.province) emit('select-province', result.province)
      }

      // --- native tooltip + delegated events ---
      const wrapperRef = ref<HTMLElement>()
      let tooltip: Tooltip | undefined
      let activeEl: Element | null = null
      let hoverEmitted = false
      const tip = () => (tooltip ??= createTooltip(wrapperRef.value!.ownerDocument))
      const hideTip = () => {
        tooltip?.hide()
        activeEl = null
      }

      /** The area an element stands for; capitals have none (they only show a tooltip). */
      const areaFor = (el: Element) => {
        if (el.hasAttribute('data-index')) return model.value.areas[Number(el.getAttribute('data-index'))]
        if (el.hasAttribute('data-island-id')) return islandsById.value.get(el.getAttribute('data-island-id')!)?.area
        return undefined
      }
      const activate = (el: Element) => {
        const capital = capitalsById.value.get(el.getAttribute('data-capital-id') ?? '')
        if (capital) return emit('capital-select', capital)
        const island = islandsById.value.get(el.getAttribute('data-island-id') ?? '')
        if (island) {
          handleSelect(island.area, false)
          return emit('island-select', toPublicIsland(island), toPublicArea(island.area))
        }
        const area = areaFor(el)
        if (area) handleSelect(area)
      }
      const emitHover = (el: Element, hovering: boolean) => {
        const area = areaFor(el)
        if (!area) return
        hoverEmitted = hovering
        emit('hover', hovering ? toPublicArea(area) : null)
      }
      const leave = (el: Element) => {
        hideTip()
        emitHover(el, false)
      }

      // Keep the tooltip honest when the model changes under it: refresh its text, and when the
      // hovered element is gone (mode switch, data change) hide it and clear the hover.
      watch(
        [model, () => props.tooltipTitle],
        () => {
          if (!activeEl) return
          if (!activeEl.isConnected) {
            hideTip()
            if (hoverEmitted) {
              hoverEmitted = false
              emit('hover', null)
            }
            return
          }
          tooltip?.setText(activeEl.getAttribute('data-tooltip-content') || '')
        },
        { flush: 'post' },
      )

      const onMouseover = (event: MouseEvent) => {
        const el = interactiveOf(event.target)
        // Moving between an island's hit circle and shape stays inside one interactive element.
        if (!el || interactiveOf(event.relatedTarget) === el) return
        activeEl = el
        tip().showAtPoint(el.getAttribute('data-tooltip-content') || '', event.clientX, event.clientY)
        emitHover(el, true)
      }
      const onMouseout = (event: MouseEvent) => {
        const el = interactiveOf(event.target)
        if (!el || interactiveOf(event.relatedTarget) === el) return
        leave(el)
      }
      const onMousemove = (event: MouseEvent) => {
        if (activeEl) tooltip?.move(event.clientX, event.clientY)
      }
      const onFocusin = (event: FocusEvent) => {
        const el = interactiveOf(event.target)
        // A mouse click focuses the element it hovers; keep the pointer-anchored tooltip then.
        if (!el || el === activeEl) return
        activeEl = el
        tip().showAtElement(el.getAttribute('data-tooltip-content') || '', el)
        emitHover(el, true)
      }
      const onFocusout = (event: FocusEvent) => {
        const el = interactiveOf(event.target)
        if (el) leave(el)
      }
      const onClick = (event: MouseEvent) => {
        const el = interactiveOf(event.target)
        if (el) activate(el)
      }
      // Enter activates on keydown (ignoring auto-repeat); Space on keyup, like a native button.
      let spaceTarget: Element | null = null
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') return hideTip()
        const el = interactiveOf(event.target)
        if (!el) return
        if (event.key === ' ') {
          event.preventDefault()
          if (!event.repeat) spaceTarget = el
        } else if (event.key === 'Enter') {
          event.preventDefault()
          if (!event.repeat) activate(el)
        }
      }
      const onKeyup = (event: KeyboardEvent) => {
        if (event.key !== ' ') return
        const el = interactiveOf(event.target)
        const pressed = spaceTarget
        spaceTarget = null
        if (el && el === pressed) {
          event.preventDefault()
          activate(el)
        }
      }

      // Outside-click dismissal. Registered after mount (SSR-safe), paused while the map sits in
      // a deactivated <KeepAlive> subtree, and removed on unmount.
      const onDocumentClick = (event: MouseEvent) => {
        const wrapper = wrapperRef.value
        if (!wrapper) return
        if (wrapper.contains(event.target as Node) && interactiveOf(event.target)) return
        // Also dismisses a tooltip left open by a touch tap (touch has no mouseout).
        hideTip()
        clearSelection()
      }
      let ownerDocument: Document | undefined
      const attach = () => {
        ownerDocument ??= wrapperRef.value?.ownerDocument
        ownerDocument?.addEventListener('click', onDocumentClick, true)
      }
      const detach = () => ownerDocument?.removeEventListener('click', onDocumentClick, true)
      onMounted(attach)
      onActivated(() => {
        detach() // addEventListener is idempotent for the same listener; this keeps it explicit
        attach()
      })
      onDeactivated(() => {
        detach()
        hideTip()
      })
      onBeforeUnmount(() => {
        detach()
        tooltip?.destroy()
        tooltip = undefined
      })

      // --- render (memoized so a selection change only patches the affected shapes) ---
      const water: VNode[] = []
      const land: VNode[] = []
      const areaCache: VNode[] = []
      const islandCache: VNode[] = []
      const labelCache: VNode[] = []
      const capitalCache: VNode[] = []

      return () => {
        const m = model.value
        const scale = m.mapScale
        const metrics = getLabelMetrics(scale)
        const selectedAreaColor = resolveSelectedAreaColor(props)
        const selected = selectedId.value
        const showWater = props.showWater ?? iranMapDefaults.showWater
        const showIslands = props.showIslands ?? iranMapDefaults.showIslands
        const capitalsInteractive = hasListener(instance, 'onCapitalSelect')
        const children: VNode[] = []

        if (showWater) {
          children.push(
            withMemo(
              [m.waterBodies, props.waterColor, props.seaLabelColor, props.showSeaLabels, scale],
              () =>
                h('g', { class: 'iran-map-water-layer', 'aria-hidden': 'true' }, [
                  ...m.waterBodies.map((waterBody) =>
                    h('path', {
                      key: waterBody.id,
                      'data-water-id': waterBody.id,
                      d: waterBody.path,
                      fill: props.waterColor,
                      'fill-rule': 'evenodd',
                    }),
                  ),
                  ...(props.showSeaLabels
                    ? getLabeledWaterBodies(m.waterBodies).map((waterBody) =>
                        h(
                          'g',
                          {
                            key: `water-label:${waterBody.id}`,
                            class: 'iran-map-water-label',
                            transform: `translate(${waterBody.labelX} ${waterBody.labelY})`,
                            fill: props.seaLabelColor,
                          },
                          [
                            h(
                              'text',
                              {
                                class: 'iran-map-water-label-fa',
                                'text-anchor': 'middle',
                                lang: 'fa',
                                'font-size': metrics.waterLabelFa.fontSize,
                              },
                              waterBody.faName,
                            ),
                            h(
                              'text',
                              {
                                class: 'iran-map-water-label-en',
                                y: metrics.waterLabelEn.y,
                                'text-anchor': 'middle',
                                'font-size': metrics.waterLabelEn.fontSize,
                              },
                              waterBody.name,
                            ),
                          ],
                        ),
                      )
                    : []),
                ]),
              water,
              0,
            ),
          )
        }

        if (m.landBackgrounds.length > 0) {
          children.push(
            withMemo(
              [m.landBackgrounds, props.deactiveProvinceColor],
              () =>
                h(
                  'g',
                  { class: 'iran-map-land-background', 'aria-hidden': 'true' },
                  m.landBackgrounds.map((boundary) =>
                    h('path', {
                      key: boundary.id,
                      d: boundary.path,
                      fill: props.deactiveProvinceColor,
                      'fill-rule': 'evenodd',
                    }),
                  ),
                ),
              land,
              0,
            ),
          )
        }

        m.areas.forEach((area, index) => {
          const isSelected = area.id === selected
          children.push(
            withMemo(
              [area, isSelected, selectedAreaColor, props.strokeColor, props.strokeWidth, props.tooltipTitle],
              () => {
                const tooltipText = getAreaTooltip(area, props.tooltipTitle)
                return h('path', {
                  key: `${area.type}:${area.id}:${index}`,
                  class: 'iran-map-area',
                  d: area.path,
                  fill: getAreaFill(area, selected, selectedAreaColor),
                  'fill-rule': 'evenodd',
                  stroke: props.strokeColor,
                  'stroke-width': props.strokeWidth,
                  ...stroke,
                  'vector-effect': 'non-scaling-stroke',
                  tabindex: 0,
                  role: 'button',
                  'aria-pressed': isSelected,
                  'aria-label': tooltipText,
                  'data-testid': getAreaTestId(area),
                  'data-area-id': area.id,
                  'data-area-type': area.type,
                  'data-index': index,
                  'data-tooltip-content': tooltipText,
                })
              },
              areaCache,
              index,
            ),
          )
        })

        if (showIslands) {
          m.islands.forEach((island, index) => {
            children.push(
              withMemo(
                [
                  island,
                  island.area.id === selected,
                  selectedAreaColor,
                  props.strokeColor,
                  props.strokeWidth,
                  props.textColor,
                  props.showIslandLabels,
                  scale,
                ],
                () => {
                  const tooltipText = getIslandTooltip(island)
                  return h(
                    'g',
                    {
                      key: island.id,
                      class: 'iran-map-island',
                      tabindex: 0,
                      role: 'button',
                      'aria-label': tooltipText,
                      'data-testid': getIslandTestId(island),
                      'data-island-id': island.id,
                      'data-province-id': island.provinceId,
                      'data-county-id': island.countyId,
                      'data-latitude': island.latitude,
                      'data-longitude': island.longitude,
                      'data-tooltip-content': tooltipText,
                    },
                    [
                      h('circle', {
                        class: 'iran-map-island-hit',
                        cx: island.labelX,
                        cy: island.labelY,
                        r: metrics.islandHitRadius,
                      }),
                      h('path', {
                        class: 'iran-map-island-shape',
                        d: island.path,
                        fill: getIslandFill(island, selected, selectedAreaColor),
                        'fill-rule': 'evenodd',
                        stroke: props.strokeColor,
                        'stroke-width': props.strokeWidth,
                        ...stroke,
                        'vector-effect': 'non-scaling-stroke',
                      }),
                      props.showIslandLabels && island.featured
                        ? h(
                            'text',
                            {
                              class: 'iran-map-island-label',
                              x: island.labelX,
                              y: island.labelY + metrics.islandLabel.offsetY,
                              fill: props.textColor,
                              'text-anchor': 'middle',
                              'font-size': metrics.islandLabel.fontSize,
                              'stroke-width': metrics.islandLabel.strokeWidth,
                            },
                            island.faName,
                          )
                        : null,
                    ],
                  )
                },
                islandCache,
                index,
              ),
            )
          })
        }

        if (m.showLabels) {
          getProvinceLabelAreas(m.areas).forEach((area, index) => {
            children.push(
              withMemo(
                [area, props.textColor, scale],
                () =>
                  h(
                    'text',
                    {
                      key: `label:${area.id}`,
                      class: 'iran-map-label',
                      x: area.labelX,
                      y: area.labelY,
                      fill: props.textColor,
                      'text-anchor': 'middle',
                      'dominant-baseline': 'middle',
                      'font-size': metrics.provinceLabel.fontSize,
                      'stroke-width': metrics.provinceLabel.strokeWidth,
                    },
                    area.faName,
                  ),
                labelCache,
                index,
              ),
            )
          })
        }

        m.capitals.forEach((capital, index) => {
          children.push(
            withMemo(
              [
                capital,
                props.capitalMarkerSize,
                props.capitalMarkerColor,
                props.showCapitalLabels,
                props.textColor,
                scale,
                capitalsInteractive,
              ],
              () => {
                const marker = getCapitalMarkerGeometry(capital, props.capitalMarkerSize, scale)
                const tooltipText = getCapitalTooltip(capital)
                return h(
                  'g',
                  {
                    key: capital.id,
                    class: `iran-map-capital iran-map-capital--${capital.areaType}`,
                    transform: `translate(${capital.x} ${capital.y})`,
                    // Without a handler a capital only shows its tooltip: not a focusable button.
                    ...(capitalsInteractive ? { tabindex: 0, role: 'button' } : { role: 'img' }),
                    'aria-label': tooltipText,
                    'data-testid': getCapitalTestId(capital),
                    'data-capital-id': capital.id,
                    'data-area-id': capital.areaId,
                    'data-capital-type': capital.areaType,
                    'data-latitude': capital.latitude,
                    'data-longitude': capital.longitude,
                    'data-tooltip-content': tooltipText,
                  },
                  [
                    h('circle', { class: 'iran-map-capital-hit', r: marker.hitRadius }),
                    h('circle', { class: 'iran-map-capital-halo', r: marker.haloRadius }),
                    marker.shape === 'diamond'
                      ? h('path', {
                          class: 'iran-map-capital-core',
                          d: marker.diamondPath,
                          fill: props.capitalMarkerColor,
                        })
                      : h('circle', {
                          class: 'iran-map-capital-core',
                          r: marker.coreRadius,
                          fill: props.capitalMarkerColor,
                        }),
                    h('circle', { class: 'iran-map-capital-center', r: marker.centerRadius }),
                    props.showCapitalLabels
                      ? h(
                          'text',
                          {
                            class: 'iran-map-capital-label',
                            x: marker.label.x,
                            y: marker.label.y,
                            fill: props.textColor,
                            'font-size': metrics.capitalLabel.fontSize,
                            'stroke-width': metrics.capitalLabel.strokeWidth,
                          },
                          capital.faName,
                        )
                      : null,
                  ],
                )
              },
              capitalCache,
              index,
            ),
          )
        })

        const width = props.width || iranMapDefaults.width
        return h(
          'div',
          {
            ref: wrapperRef,
            class: ['iran-map-wrapper', props.className],
            style: { width: typeof width === 'number' ? `${width}px` : width },
          },
          [
            h(
              'svg',
              {
                class: 'iran-map',
                xmlns: 'http://www.w3.org/2000/svg',
                viewBox: m.viewBox,
                'shape-rendering': 'geometricPrecision',
                role: 'group',
                'aria-label': props.ariaLabel,
                style: { width: '100%', height: 'auto', color: props.textColor },
                onClick,
                onKeydown,
                onKeyup,
                onMouseover,
                onMouseout,
                onMousemove,
                onFocusin,
                onFocusout,
              },
              children,
            ),
          ],
        )
      }
    },
  })
}
