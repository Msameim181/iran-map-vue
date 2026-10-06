import { computed, defineComponent, h, markRaw, onBeforeUnmount, onMounted, ref, toRaw } from 'vue'
import type { VNode } from 'vue'
import { buildModel, getAreaTooltip, getCapitalTooltip, getIslandTooltip, toPublicArea, toPublicIsland } from './core'
import type { IranMapCatalogs } from './core'
import { iranMapEmits, iranMapProps } from './props'
import { createTooltip } from './tooltip'
import type { Tooltip } from './tooltip'
import type { IranMapCapital } from './types'
import { warnMissingCatalogs } from './warn'

const INTERACTIVE = '.iran-map-area, .iran-map-island, .iran-map-capital'

const interactiveOf = (target: EventTarget | null): Element | null => {
  const node = target as Node | null
  const element = node?.nodeType === 1 ? (node as Element) : (node?.parentElement ?? null)
  return element?.closest(INTERACTIVE) ?? null
}

const stroke = { 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'stroke-miterlimit': 1 }

/**
 * Builds an IranMap component bound to default catalogs. The root entry binds the lean
 * (provinces-only) set and `/full` binds everything, so both share this one implementation.
 */
export const createIranMap = (defaults: Partial<IranMapCatalogs>) => {
  const lean = markRaw({ ...defaults })

  return defineComponent({
    name: 'IranMap',
    props: iranMapProps,
    emits: iranMapEmits,
    setup(props, { emit }) {
      // Catalogs are multi-MB: never let Vue proxy them (toRaw undoes a parent's deep ref()).
      const catalogs = computed(() => (props.catalogs ? markRaw({ ...lean, ...toRaw(props.catalogs) }) : lean)) as {
        value: IranMapCatalogs
      }

      const model = computed(() => {
        const needs = {
          mode: props.mode,
          detailedCounties: props.detailedCounties,
          showWater: props.showWater,
          showIslands: props.showIslands,
          capitalMarkers: props.capitalMarkers,
        }
        warnMissingCatalogs(needs, catalogs.value)
        return buildModel(
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
            showLabels: props.showLabels,
          },
          catalogs.value,
        )
      })
      // Index lookups for delegated events (ids are unique per layer).
      const islandsById = computed(() => new Map(model.value.islands.map((island) => [island.id, island])))
      const capitalsById = computed(() => new Map(model.value.capitals.map((capital) => [capital.id, capital])))

      // --- selection (uncontrolled by default; controlled when `selectedArea` is not undefined) ---
      const inner = ref<string | undefined>(props.defaultSelectedArea || props.defaultSelectedProvince)
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
        setSelected(undefined)
        emit('deselect')
        emit('hover', null)
        if (catalogs.value.provinces.some((province) => province.id === id)) {
          emit('select-province', { name: undefined, faName: undefined })
        }
      }
      const handleSelect = (area: (typeof model.value.areas)[number], toggle = true) => {
        if (toggle && area.id === selectedId.value) {
          clearSelection()
          return
        }
        setSelected(area.id)
        emit('select', toPublicArea(area))
        if (area.type === 'province') emit('select-province', { name: area.id, faName: area.faName })
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

      /** Public area hovered for an element, or undefined for capitals (which only show a tooltip). */
      const areaFor = (el: Element) => {
        if (el.classList.contains('iran-map-area')) return model.value.areas[Number(el.getAttribute('data-index'))]
        if (el.classList.contains('iran-map-island'))
          return islandsById.value.get(el.getAttribute('data-island-id')!)?.area
        return undefined
      }
      const activate = (el: Element) => {
        if (el.classList.contains('iran-map-capital')) {
          const capital = capitalsById.value.get(el.getAttribute('data-capital-id')!)
          if (capital) emit('capital-select', capital as IranMapCapital)
          return
        }
        if (el.classList.contains('iran-map-island')) {
          const island = islandsById.value.get(el.getAttribute('data-island-id')!)
          if (!island) return
          handleSelect(island.area, false)
          emit('island-select', toPublicIsland(island), toPublicArea(island.area))
          return
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
        if (event.key !== 'Enter' && event.key !== ' ') return
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
      const selectedColor = () => props.selectedAreaColor || props.selectedProvinceColor

      return () => {
        const m = model.value
        const scale = m.mapScale
        const selectedAreaColor = selectedColor()
        const fillFor = (areaId: string, value: number | undefined, fill: string) =>
          areaId === selectedId.value && selectedAreaColor && value !== undefined ? selectedAreaColor : fill

        const svgChildren: VNode[] = []

        if (props.showWater) {
          svgChildren.push(
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
                ? m.waterBodies
                    .filter((water) => water.showLabel !== false)
                    .map((water) =>
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
                              'font-size': 14 * scale,
                            },
                            water.faName,
                          ),
                          h(
                            'text',
                            {
                              class: 'iran-map-water-label-en',
                              y: 14 * scale,
                              'text-anchor': 'middle',
                              'font-size': 7 * scale,
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
          svgChildren.push(
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
          svgChildren.push(
            h('path', {
              key: `${area.type}:${area.id}:${index}`,
              d: area.path,
              fill: fillFor(area.id, area.value, area.fill),
              'fill-rule': 'evenodd',
              stroke: props.strokeColor,
              'stroke-width': props.strokeWidth,
              ...stroke,
              'vector-effect': 'non-scaling-stroke',
              tabindex: 0,
              role: 'button',
              'aria-pressed': area.id === selectedId.value,
              'aria-label': tooltipText,
              'data-testid': `iran-map-${area.type}-${area.id}`,
              'data-area-id': area.id,
              'data-area-type': area.type,
              'data-index': index,
              'data-tooltip-content': tooltipText,
              class: 'iran-map-area',
            }),
          )
        })

        if (props.showIslands) {
          for (const island of m.islands) {
            const tooltipText = getIslandTooltip(island)
            const selected = island.area.id === selectedId.value
            svgChildren.push(
              h(
                'g',
                {
                  key: island.id,
                  class: 'iran-map-island',
                  tabindex: 0,
                  role: 'button',
                  'aria-label': tooltipText,
                  'data-testid': `iran-map-island-${island.id}`,
                  'data-island-id': island.id,
                  'data-province-id': island.provinceId,
                  'data-county-id': island.countyId,
                  'data-latitude': island.latitude,
                  'data-longitude': island.longitude,
                  'data-tooltip-content': tooltipText,
                },
                [
                  h('circle', { class: 'iran-map-island-hit', cx: island.labelX, cy: island.labelY, r: 6 * scale }),
                  h('path', {
                    class: 'iran-map-island-shape',
                    d: island.path,
                    fill:
                      selected && selectedAreaColor && island.area.value !== undefined
                        ? selectedAreaColor
                        : island.fill,
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
                          y: island.labelY - 8 * scale,
                          fill: props.textColor,
                          'text-anchor': 'middle',
                          'font-size': 7 * scale,
                          'stroke-width': 1.25 * scale,
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
          for (const area of m.areas) {
            if (area.type !== 'province' || area.labelX === undefined || area.labelY === undefined) continue
            svgChildren.push(
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
                  'font-size': 12 * scale,
                  'stroke-width': 1.25 * scale,
                },
                area.faName,
              ),
            )
          }
        }

        for (const capital of m.capitals) {
          const baseSize = capital.areaType === 'province' ? props.capitalMarkerSize * 1.25 : props.capitalMarkerSize
          const size = baseSize * scale
          const tooltipText = getCapitalTooltip(capital)
          svgChildren.push(
            h(
              'g',
              {
                key: capital.id,
                class: `iran-map-capital iran-map-capital--${capital.areaType}`,
                transform: `translate(${capital.x} ${capital.y})`,
                tabindex: 0,
                role: 'button',
                'aria-label': tooltipText,
                'data-testid': `iran-map-capital-${capital.areaType}-${capital.areaId}`,
                'data-capital-id': capital.id,
                'data-area-id': capital.areaId,
                'data-capital-type': capital.areaType,
                'data-latitude': capital.latitude,
                'data-longitude': capital.longitude,
                'data-tooltip-content': tooltipText,
              },
              [
                h('circle', { class: 'iran-map-capital-hit', r: Math.max(9, size * 2) }),
                h('circle', { class: 'iran-map-capital-halo', r: size * 1.75 }),
                capital.areaType === 'province'
                  ? h('path', {
                      class: 'iran-map-capital-core',
                      d: `M0 ${-size * 1.35} L${size * 1.35} 0 L0 ${size * 1.35} L${-size * 1.35} 0 Z`,
                      fill: props.capitalMarkerColor,
                    })
                  : h('circle', { class: 'iran-map-capital-core', r: size, fill: props.capitalMarkerColor }),
                h('circle', { class: 'iran-map-capital-center', r: Math.max(1.1, size * 0.28) }),
                props.showCapitalLabels
                  ? h(
                      'text',
                      {
                        class: 'iran-map-capital-label',
                        x: size * 2.2,
                        y: -size * 1.5,
                        fill: props.textColor,
                        'font-size': 10 * scale,
                        'stroke-width': 1.25 * scale,
                      },
                      capital.faName,
                    )
                  : null,
              ],
            ),
          )
        }

        const width = props.width || 500
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
              svgChildren,
            ),
            // Driven imperatively (see tooltip.ts); no reactive props so Vue never patches it.
            h('div', { ref: tooltipRef, class: 'iran-map-tooltip', role: 'tooltip', hidden: true }),
          ],
        )
      }
    },
  })
}
