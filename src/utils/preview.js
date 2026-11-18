// Props that light up a route or a place on the globe while the pointer or keyboard focus is on an element.
// `target` is { routeKeys: [...] } or { code }; `onPreview(null)` clears it.
export function previewProps(onPreview, target) {
  if (!onPreview) return {}
  return {
    onMouseEnter: () => onPreview(target),
    onMouseLeave: () => onPreview(null),
    onFocus: () => onPreview(target),
    onBlur: () => onPreview(null),
  }
}
