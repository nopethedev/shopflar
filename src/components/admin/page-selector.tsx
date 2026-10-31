'use client'
export function PageSelector({ pages, currentPageType, currentPageId }) {
  return (
    <select
      value={currentPageType === 'home' ? 'home' : `custom:${currentPageId}`}
      onChange={(e) => {
        const val = e.target.value
        if (val === 'home') window.location.href = '/admin/builder'
        else {
          const [, id] = val.split(':')
          window.location.href = `/admin/builder?pageType=custom&pageId=${id}`
        }
      }}
      className="h-8 px-2 rounded-md border border-input bg-background text-sm"
    >
      <option value="home">Home Page</option>
      {pages.map(p => (
        <option key={p.id} value={`custom:${p.id}`}>{p.title}</option>
      ))}
    </select>
  )
}
