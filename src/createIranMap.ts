import { computed, defineComponent, h, markRaw, onBeforeUnmount, onMounted, ref, toRaw } from 'vue'
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
  isActivationKey,
  iranMapDefaults,
  resolveAreaSelection,
  resolveDefaultSelectedArea,
  resolveSelectedAreaColor,
  toPublicArea,
  toPublicIsland,
} from '@msameim181/iran-map-core'
import type { IranMapCatalogs, RenderableMapArea } from '@msameim181/iran-map-core'
import { iranMapEmits, iranMapProps } from './props'
import { createTooltip } from './tooltip'
import type { Tooltip } from './tooltip'

const interactiveOf = (target: EventTarget | null): Element | null => {
  const node = target as Node | null
  const element = node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null)
  return element?.closest(SELECTABLE_ELEMENT_SELECTOR) ?? null
}

const stroke = { 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-miterlimit': 1 }
const warned = new Set<string>()

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
      // Catalogs are multi-MB: never let Vue proxy them (toRaw undoes a parent's deep ref()).
      const catalogs = computed<IranMapCatalogs>(() =>
        props.catalogs ? markRaw({ ...lean, ...toRaw(props.catalogs) }) : lean,
      )

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
        // Literal `process.env.NODE_ENV` check so consumer bundlers strip this in production.
        if (process.env.NODE_ENV !== 'production') {
          for (const warning of result.warnings) {
            if (warned.has(warning)) continue
            warned.add(warning)
            console.warn(
              `[iran-map-vue] ${warning}. Import IranMap from '@msameim181/iran-map-vue/full' or pass the catalog via the \`catalogs\` prop.`,
            )
          }
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
      const tooltipRef = ref<HTMLElement>()
      let tooltip: Tooltip | undefined
      let activeEl: Element | null = null
      const tip = () => (tooltip ??= createTooltip(tooltipRef.value!))
      const hideTip = () => {
        if (!tooltip?.visible) return
        tooltip.hide()
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
        if (area) emit('hover', hovering ? toPublicArea(area) : null)
      }

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
        hideTip()
        emitHover(el, false)
      }
      const onMousemove = (event: MouseEvent) => {
        if (activeEl && tooltip?.visible) tooltip.move(event.clientX, event.clientY)
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
        if (!el) return
        hideTip()
        emitHover(el, false)
      }
      const onClick = (event: MouseEvent) => {
        const el = interactiveOf(event.target)
        if (el) activate(el)
      }
      const onKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') return hideTip()
        if (!isActivationKey(event.key)) return
        const el = interactiveOf(event.target)
        if (!el) return
        event.preventDefault()
        activate(el)
      }

      // Outside-click dismissal. Registered once after mount (SSR-safe) and removed on unmount.
      const onDocumentClick = (event: MouseEvent) => {
        const wrapper = wrapperRef.value
        if (!wrapper) return
        if (wrapper.contains(event.target as Node) && interactiveOf(event.target)) return
        // Also dismisses a tooltip left open by a touch tap (touch has no mouseout).
        hideTip()
        clearSelection()
      }
      let ownerDocument: Document | undefined
      onMounted(() => {
        ownerDocument = wrapperRef.value?.ownerDocument
        ownerDocument?.addEventListener('click', onDocumentClick, true)
      })
      onBeforeUnmount(() => ownerDocument?.removeEventListener('click', onDocumentClick, true))

      // --- render ---
      return () => {
        const m = model.value
        const scale = m.mapScale
        const metrics = getLabelMetrics(scale)
        const selectedAreaColor = resolveSelectedAreaColor(props)
        const showWater = props.showWater ?? iranMapDefaults.showWater
        const showIslands = props.showIslands ?? iranMapDefaults.showIslands
        const children: VNode[] = []

        if (showWater) {
          children.push(
            h('g', { class: 'iran-map-water-layer', 'aria-hidden': 'true' }, [
              ...m.waterBodies.map((water) =>
                h('path', {
                  key: water.id,
                  'data-water-id': water.id,
                  d: water.path,
                  fill: props.waterColor,
                  'fill-rule': 'evenodd',
                }),
              ),
              ...(props.showSeaLabels
                ? getLabeledWaterBodies(m.waterBodies).map((water) =>
                    h(
                      'g',
                      {
                        key: `water-label:${water.id}`,
                        class: 'iran-map-water-label',
                        transform: `translate(${water.labelX} ${water.labelY})`,
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
                          water.faName,
                        ),
                        h(
                          'text',
                          {
                            class: 'iran-map-water-label-en',
                            y: metrics.waterLabelEn.y,
                            'text-anchor': 'middle',
                            'font-size': metrics.waterLabelEn.fontSize,
                          },
                          water.name,
                        ),
                      ],
                    ),
                  )
                : []),
            ]),
          )
        }

        if (m.landBackgrounds.length > 0) {
          children.push(
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
          )
        }

        m.areas.forEach((area, index) => {
          const tooltipText = getAreaTooltip(area, props.tooltipTitle)
          children.push(
            h('path', {
              key: `${area.type}:${area.id}:${index}`,
              class: 'iran-map-area',
              d: area.path,
              fill: getAreaFill(area, selectedId.value, selectedAreaColor),
              'fill-rule': 'evenodd',
              stroke: props.strokeColor,
              'stroke-width': props.strokeWidth,
              ...stroke,
              'vector-effect': 'non-scaling-stroke',
              tabindex: 0,
              role: 'button',
              'aria-pressed': area.id === selectedId.value,
              'aria-label': tooltipText,
              'data-testid': getAreaTestId(area),
              'data-area-id': area.id,
              'data-area-type': area.type,
              'data-index': index,
              'data-tooltip-content': tooltipText,
            }),
          )
        })

        if (showIslands) {
          for (const island of m.islands) {
            const tooltipText = getIslandTooltip(island)
            children.push(
              h(
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
                    fill: getIslandFill(island, selectedId.value, selectedAreaColor),
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
              ),
            )
          }
        }

        if (m.showLabels) {
          for (const area of getProvinceLabelAreas(m.areas)) {
            children.push(
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
            )
          }
        }

        for (const capital of m.capitals) {
          const marker = getCapitalMarkerGeometry(capital, props.capitalMarkerSize, scale)
          const tooltipText = getCapitalTooltip(capital)
          children.push(
            h(
              'g',
              {
                key: capital.id,
                class: `iran-map-capital iran-map-capital--${capital.areaType}`,
                transform: `translate(${capital.x} ${capital.y})`,
                tabindex: 0,
                role: 'button',
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
                  ? h('path', { class: 'iran-map-capital-core', d: marker.diamondPath, fill: props.capitalMarkerColor })
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
            ),
          )
        }

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
                role: 'img',
                'aria-label': props.ariaLabel,
                style: { width: '100%', height: 'auto', color: props.textColor },
                onClick,
                onKeydown,
                onMouseover,
                onMouseout,
                onMousemove,
                onFocusin,
                onFocusout,
              },
              children,
            ),
            // Driven imperatively (see tooltip.ts); no reactive props so Vue never patches it.
            h('div', { ref: tooltipRef, class: 'iran-map-tooltip', role: 'tooltip', hidden: true }),
          ],
        )
      }
    },
  })
}
