export function createFaceReviewPage() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <title>Review detected people</title>
  <style>
    :root { color-scheme:dark; font-family:Inter,ui-sans-serif,system-ui,sans-serif; background:#090908; color:#f5f5f4 }
    * { box-sizing:border-box }
    body { margin:0 }
    button,input,select { font:inherit }
    button { cursor:pointer }
    button:focus-visible,input:focus-visible,select:focus-visible { outline:3px solid #34d399; outline-offset:2px }
    h1,h2,h3,p { margin:0 }
    .shell { width:min(1080px,100%); margin:auto; padding:24px 18px }
    .top { display:grid; grid-template-columns:1fr auto; gap:18px; align-items:end }
    h1 { font-size:clamp(1.75rem,4vw,2.75rem); letter-spacing:-.04em; line-height:1 }
    .lede { max-width:65ch; margin-top:9px; color:#a8a29e; font-size:.9rem; line-height:1.5 }
    .stats,.tabs,.filters,.actions,.face-tools { display:flex; flex-wrap:wrap; gap:7px }
    .stat,.score { padding:6px 9px; border:1px solid #292524; border-radius:8px; background:#151412; color:#d6d3d1; font-size:.75rem }
    .toolbar { position:sticky; top:0; z-index:10; display:flex; flex-wrap:wrap; justify-content:space-between; gap:9px; margin:16px -7px 0; padding:9px 7px; background:rgb(9 9 8 / .94); backdrop-filter:blur(14px) }
    .button { min-height:36px; padding:7px 11px; border:1px solid #44403c; border-radius:9px; background:#1c1917; color:#f5f5f4 }
    .button:hover { background:#292524 }
    .button.primary { border-color:#10b981; background:#10b981; color:#052e16; font-weight:800 }
    .button.danger { color:#fecaca }
    .button[aria-pressed="true"] { border-color:#34d399; background:#064e3b; color:#a7f3d0 }
    .button:disabled { cursor:not-allowed; opacity:.45 }
    .tip { margin-top:12px; padding:10px 12px; border:1px solid #365314; border-radius:10px; background:#162407; color:#d9f99d; font-size:.8rem; line-height:1.45 }
    .queue { margin-top:12px; border:1px solid #292524; border-radius:16px; background:#11100f; overflow:hidden }
    .queue-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 15px; border-bottom:1px solid #292524 }
    .queue-title { font-size:1rem }
    .queue-copy { margin-top:3px; color:#a8a29e; font-size:.75rem }
    .comparison { display:grid; grid-template-columns:1fr 54px 1fr; gap:12px; align-items:stretch; padding:14px }
    .versus { display:grid; place-items:center; color:#78716c; font-size:.72rem; font-weight:800 }
    .person-panel { min-width:0; padding:11px; border:1px solid #292524; border-radius:12px; background:#171513 }
    .person-panel-head { display:flex; align-items:start; justify-content:space-between; gap:10px; margin-bottom:9px }
    .person-name { font-size:.9rem }
    .person-meta { margin-top:3px; color:#a8a29e; font-size:.7rem }
    .evidence { display:grid; grid-template-columns:96px 1fr; gap:8px }
    .face-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; align-content:start }
    .face { position:relative; min-width:0; padding:4px; border:1px solid #292524; border-radius:9px; background:#211e1b }
    .face.cover { border-color:#10b981 }
    .face img { display:block; width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px; background:#292524 }
    .face-name { display:block; margin-top:4px; color:#a8a29e; font-size:.58rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
    .queue-actions { display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; padding:0 14px 14px }
    .queue-actions .button { min-height:44px }
    .shortcut { color:#78716c; font-size:.68rem }
    .empty { padding:44px 18px; text-align:center; color:#a8a29e }
    .empty strong { display:block; margin-bottom:5px; color:#e7e5e4 }
    .browser { margin-top:12px }
    .browser-head { display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; align-items:center; margin-bottom:10px }
    #clusters { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px }
    .person-card { min-width:0; border:1px solid #292524; border-radius:13px; background:#11100f; overflow:hidden }
    .person-card.is-hidden { opacity:.55 }
    .card-header,.card-footer { display:flex; align-items:center; justify-content:space-between; gap:9px; padding:10px 11px }
    .card-header { border-bottom:1px solid #292524 }
    .card-footer { border-top:1px solid #292524 }
    .status { padding:4px 6px; border-radius:6px; background:#064e3b; color:#a7f3d0; font-size:.62rem; font-weight:800 }
    .status.hidden { background:#292524; color:#d6d3d1 }
    .person-body { display:grid; grid-template-columns:104px 1fr; gap:10px; min-height:145px; padding:10px }
    .cover-panel { min-width:0; padding-right:10px; border-right:1px solid #292524 }
    .section-label { margin-bottom:6px; color:#a8a29e; font-size:.64rem; font-weight:800; letter-spacing:.05em; text-transform:uppercase }
    .cover-panel .face { width:84px }
    .face-tools { margin-top:4px }
    .face-tools button { flex:1; min-width:0; padding:4px; border:1px solid #44403c; border-radius:6px; background:#292524; color:#e7e5e4; font-size:.58rem }
    .face-tools .remove { flex:0 0 25px; color:#fecaca }
    .more { width:100%; margin-top:8px; border:0; background:none; color:#6ee7b7; text-align:left; font-size:.7rem }
    .card-footer .button { min-height:30px; padding:5px 8px; font-size:.7rem }
    dialog { width:min(480px,calc(100% - 24px)); max-height:80dvh; padding:0; border:1px solid #44403c; border-radius:14px; background:#171513; color:#f5f5f4; box-shadow:0 24px 80px rgb(0 0 0 / .7) }
    dialog::backdrop { background:rgb(0 0 0 / .72) }
    .dialog-head { display:flex; align-items:start; justify-content:space-between; gap:12px; padding:14px; border-bottom:1px solid #292524 }
    .dialog-body { padding:12px 14px 14px }
    .dialog-copy { margin-top:4px; color:#a8a29e; font-size:.76rem; line-height:1.4 }
    .dialog-search { width:100%; min-height:40px; margin-bottom:9px; padding:8px 10px; border:1px solid #44403c; border-radius:8px; background:#0f0e0d; color:#f5f5f4 }
    .destination-list { display:grid; gap:6px; max-height:48dvh; overflow:auto }
    .destination { display:grid; grid-template-columns:44px 1fr auto; gap:9px; align-items:center; width:100%; padding:6px; border:1px solid #292524; border-radius:9px; background:#211e1b; color:#f5f5f4; text-align:left }
    .destination img { width:44px; aspect-ratio:1; object-fit:cover; border-radius:6px }
    .save-bar { display:flex; align-items:center; gap:10px }
    .save-state { color:#a8a29e; font-size:.76rem }
    [hidden] { display:none !important }
    @media (max-width:760px) {
      .top,.comparison { grid-template-columns:1fr }
      .versus { min-height:26px }
      #clusters { grid-template-columns:1fr }
      .queue-actions { grid-template-columns:1fr }
    }
    @media (max-width:480px) {
      .shell { padding-inline:10px }
      .evidence { grid-template-columns:80px 1fr }
      .face-grid { grid-template-columns:repeat(2,minmax(0,1fr)) }
      .save-state { display:none }
    }
  </style>
</head>
<body>
  <main class="shell">
    <header class="top">
      <div>
        <h1>Review detected people</h1>
        <p class="lede">Start with likely duplicate people. Confirm or reject each suggestion, then inspect individual photos only where needed.</p>
      </div>
      <div class="stats" id="stats"></div>
    </header>

    <div class="toolbar">
      <div class="tabs" role="group" aria-label="Review mode">
        <button class="button" data-mode="suggestions" aria-pressed="true">Review duplicates</button>
        <button class="button" data-mode="people" aria-pressed="false">Browse people</button>
      </div>
      <div class="filters" id="filters" role="group" aria-label="Filter people" hidden>
        <button class="button" data-filter="all" aria-pressed="true">All</button>
        <button class="button" data-filter="multi" aria-pressed="false">Multiple photos</button>
        <button class="button" data-filter="single" aria-pressed="false">One photo</button>
        <button class="button" data-filter="hidden" aria-pressed="false">Hidden</button>
      </div>
      <div class="save-bar">
        <span class="save-state" id="save-state">No unsaved changes</span>
        <button class="button primary" id="save">Save review</button>
      </div>
    </div>

    <div class="tip" id="tip">A similarity score ranks suggestions. It is not a percentage or identity confidence. “Different people” prevents the same pair from being suggested again.</div>

    <section class="queue" id="queue" aria-live="polite"></section>

    <section class="browser" id="browser" hidden>
      <div class="browser-head">
        <p class="queue-copy">Open a group to inspect every face. Use Move when one photo belongs to somebody else.</p>
        <button class="button" id="new-group">New empty person</button>
      </div>
      <div id="clusters"></div>
      <div class="empty" id="browser-empty" hidden>No people match this filter.</div>
    </section>
  </main>

  <dialog id="move-dialog" aria-labelledby="move-title">
    <div class="dialog-head">
      <div>
        <h2 class="queue-title" id="move-title">Move face to another person</h2>
        <p class="dialog-copy">Choose the person this face actually belongs to.</p>
      </div>
      <button class="button" id="close-dialog" aria-label="Close">Close</button>
    </div>
    <div class="dialog-body">
      <input class="dialog-search" id="destination-search" type="search" placeholder="Search person number">
      <div class="destination-list" id="destination-list"></div>
    </div>
  </dialog>

  <script>
    let review
    let mode = 'suggestions'
    let activeFilter = 'all'
    let dirty = false
    let queueIndex = 0
    let moveRequest
    let suggestions = []
    let showPossible = false
    const skipped = new Set()
    const expanded = new Set()
    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]))
    const uniquePhotos = (cluster) => new Set(cluster.detections.map((face) => face.filename)).size
    const photoText = (cluster) => uniquePhotos(cluster) + ' photo' + (uniquePhotos(cluster) === 1 ? '' : 's')
    const faceText = (cluster) => cluster.detections.length + ' face' + (cluster.detections.length === 1 ? '' : 's')
    const label = (cluster) => 'Person ' + String(review.clusters.indexOf(cluster) + 1).padStart(2, '0')
    const pairKey = (leftId, rightId) => [leftId,rightId].sort().join(':')
    const rejected = () => new Set(review.rejectedPairs || [])
    const markDirty = () => { dirty = true; document.querySelector('#save-state').textContent = 'Unsaved changes' }
    const cosine = (left,right) => {
      let dot = 0
      let leftMagnitude = 0
      let rightMagnitude = 0
      for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index]
        leftMagnitude += left[index] ** 2
        rightMagnitude += right[index] ** 2
      }
      const denominator = Math.sqrt(leftMagnitude * rightMagnitude)
      return denominator ? dot / denominator : -1
    }
    // ponytail: O(n²) is simpler and fast for this 344-face local pilot; add an ANN index only for much larger galleries.
    const compareClusters = (left,right) => {
      if (left.detections.some((face) => right.detections.some((candidate) => candidate.filename === face.filename))) return null
      const scores = []
      for (const leftFace of left.detections) {
        for (const rightFace of right.detections) scores.push(cosine(leftFace.embedding,rightFace.embedding))
      }
      scores.sort((a,b) => b - a)
      const evidence = scores.slice(0,Math.min(3,scores.length))
      return {
        left,
        right,
        score:evidence.reduce((total,value) => total + value,0) / evidence.length,
        peak:scores[0],
        support:scores.filter((value) => value >= .58).length,
      }
    }
    const scoreLabel = (score) => score >= .76 ? 'Very likely' : score >= .66 ? 'Likely' : 'Possible'
    const buildSuggestions = () => {
      const blocked = rejected()
      const next = []
      for (let leftIndex = 0; leftIndex < review.clusters.length; leftIndex += 1) {
        const left = review.clusters[leftIndex]
        if (left.hidden || !left.detections.length) continue
        for (let rightIndex = leftIndex + 1; rightIndex < review.clusters.length; rightIndex += 1) {
          const right = review.clusters[rightIndex]
          const key = pairKey(left.id,right.id)
          if (right.hidden || !right.detections.length || blocked.has(key) || skipped.has(key)) continue
          const comparison = compareClusters(left,right)
          const floor = showPossible ? .62 : .66
          if (comparison?.score >= floor || comparison?.peak >= floor + .08) next.push({...comparison,key})
        }
      }
      suggestions = next.sort((a,b) => b.score - a.score || b.peak - a.peak)
      queueIndex = Math.min(queueIndex,Math.max(0,suggestions.length - 1))
    }
    const coverFor = (cluster) => cluster.detections.find((face) => face.id === cluster.representativeId) || cluster.detections[0]
    const faceMarkup = (face,cluster,{cover=false,tools=false}={}) => face ? \`<div class="face \${cover ? 'cover' : ''}">
        <img src="\${face.cropUrl}" alt="Face from \${escapeHtml(face.filename)}">
        <span class="face-name">\${cover ? 'Cover · ' : ''}\${escapeHtml(face.filename)}</span>
        \${tools ? \`<div class="face-tools">
          \${cover ? '' : \`<button data-cover="\${face.id}" data-cluster="\${cluster.id}">Cover</button>\`}
          <button data-move="\${face.id}" data-cluster="\${cluster.id}">Move</button>
          <button class="remove" data-remove="\${face.id}" data-cluster="\${cluster.id}" aria-label="Remove incorrect face">×</button>
        </div>\` : ''}
      </div>\` : '<div class="empty">No faces yet</div>'
    const evidenceMarkup = (cluster) => {
      const cover = coverFor(cluster)
      const others = cluster.detections.filter((face) => face !== cover).slice(0,6)
      return \`<article class="person-panel">
        <header class="person-panel-head">
          <div><h3 class="person-name">\${escapeHtml(label(cluster))}</h3><p class="person-meta">\${photoText(cluster)} · \${faceText(cluster)}</p></div>
        </header>
        <div class="evidence">
          \${faceMarkup(cover,cluster,{cover:true})}
          <div class="face-grid">\${others.map((face) => faceMarkup(face,cluster)).join('')}</div>
        </div>
      </article>\`
    }

    async function load() {
      review = await fetch('/review.json').then((response) => response.json())
      review.rejectedPairs ||= []
      buildSuggestions()
      render()
    }

    function mergePeople(left,right) {
      left.detections.push(...right.detections)
      review.clusters = review.clusters.filter((cluster) => cluster !== right)
      review.rejectedPairs = [...new Set(review.rejectedPairs.map((key) => {
        const ids = key.split(':').map((id) => id === right.id ? left.id : id)
        return ids[0] === ids[1] ? '' : pairKey(ids[0],ids[1])
      }).filter(Boolean))]
      markDirty()
      queueIndex = 0
      buildSuggestions()
      render()
    }

    function moveFace(sourceId,faceId,targetId) {
      if (sourceId === targetId) return
      const source = review.clusters.find((cluster) => cluster.id === sourceId)
      const target = review.clusters.find((cluster) => cluster.id === targetId)
      const face = source?.detections.find((candidate) => candidate.id === faceId)
      if (!source || !target || !face) return
      source.detections = source.detections.filter((candidate) => candidate !== face)
      target.detections.push(face)
      if (!target.representativeId) target.representativeId = face.id
      if (source.representativeId === face.id) source.representativeId = source.detections[0]?.id
      review.clusters = review.clusters.filter((cluster) => cluster.detections.length || cluster === target)
      markDirty()
      buildSuggestions()
      render()
    }

    function renderQueue() {
      const queue = document.querySelector('#queue')
      if (!suggestions.length) {
        queue.innerHTML = \`<div class="empty"><strong>No \${showPossible ? 'possible' : 'likely'} duplicates left</strong>\${showPossible ? 'Browse people to inspect individual photos, or save your review.' : '<button class="button" id="show-possible">Check lower similarity matches</button>'}</div>\`
        document.querySelector('#show-possible')?.addEventListener('click',() => { showPossible = true; buildSuggestions(); render() })
        return
      }
      const suggestion = suggestions[queueIndex]
      queue.innerHTML = \`<header class="queue-head">
          <div><h2 class="queue-title">Could these be the same person?</h2><p class="queue-copy">Suggestion \${queueIndex + 1} of \${suggestions.length}</p></div>
          <div class="actions">
            <span class="score">\${scoreLabel(suggestion.score)} · similarity \${suggestion.score.toFixed(2)}</span>
            <button class="button" id="toggle-possible">\${showPossible ? 'Likely matches only' : 'Include possible matches'}</button>
          </div>
        </header>
        <div class="comparison">
          \${evidenceMarkup(suggestion.left)}
          <div class="versus">OR</div>
          \${evidenceMarkup(suggestion.right)}
        </div>
        <div class="queue-actions">
          <button class="button danger" id="different">Different people <span class="shortcut">N</span></button>
          <button class="button" id="skip">Not sure <span class="shortcut">S</span></button>
          <button class="button primary" id="same">Same person <span class="shortcut">Y</span></button>
        </div>\`
      document.querySelector('#same').onclick = () => mergePeople(suggestion.left,suggestion.right)
      document.querySelector('#different').onclick = () => {
        review.rejectedPairs.push(suggestion.key)
        markDirty()
        buildSuggestions()
        render()
      }
      document.querySelector('#skip').onclick = () => {
        skipped.add(suggestion.key)
        buildSuggestions()
        render()
      }
      document.querySelector('#toggle-possible').onclick = () => {
        showPossible = !showPossible
        queueIndex = 0
        buildSuggestions()
        render()
      }
    }

    function visibleForFilter(cluster) {
      return activeFilter === 'all' || (activeFilter === 'hidden' && cluster.hidden) || (activeFilter === 'single' && uniquePhotos(cluster) === 1) || (activeFilter === 'multi' && uniquePhotos(cluster) > 1)
    }

    function renderBrowser() {
      const filtered = review.clusters.filter(visibleForFilter)
      document.querySelector('#browser-empty').hidden = Boolean(filtered.length)
      document.querySelector('#clusters').innerHTML = filtered.map((cluster) => {
        const cover = coverFor(cluster)
        const others = cluster.detections.filter((face) => face !== cover)
        const isExpanded = expanded.has(cluster.id)
        const shown = isExpanded ? others : others.slice(0,8)
        return \`<article class="person-card \${cluster.hidden ? 'is-hidden' : ''}">
          <header class="card-header">
            <div><h2 class="person-name">\${escapeHtml(label(cluster))}</h2><p class="person-meta">\${photoText(cluster)} · \${faceText(cluster)}</p></div>
            <span class="status \${cluster.hidden ? 'hidden' : ''}">\${cluster.hidden ? 'Hidden' : 'Public'}</span>
          </header>
          <div class="person-body">
            <section class="cover-panel"><h3 class="section-label">Cover</h3>\${cover ? faceMarkup(cover,cluster,{cover:true,tools:true}) : ''}</section>
            <section><h3 class="section-label">Faces assigned to this person</h3>
              <div class="face-grid">\${shown.map((face) => faceMarkup(face,cluster,{tools:true})).join('')}</div>
              \${others.length > 8 ? \`<button class="more" data-expand="\${cluster.id}">\${isExpanded ? 'Show fewer' : \`Show all \${others.length} faces\`}</button>\` : ''}
            </section>
          </div>
          <footer class="card-footer">
            <button class="button \${cluster.hidden ? '' : 'danger'}" data-hide="\${cluster.id}">\${cluster.hidden ? 'Make public' : 'Hide person'}</button>
            <button class="button" data-merge="\${cluster.id}">Merge with…</button>
          </footer>
        </article>\`
      }).join('')
      bindBrowserActions()
    }

    function bindBrowserActions() {
      document.querySelectorAll('[data-cover]').forEach((button) => button.onclick = () => {
        review.clusters.find((cluster) => cluster.id === button.dataset.cluster).representativeId = button.dataset.cover
        markDirty(); render()
      })
      document.querySelectorAll('[data-remove]').forEach((button) => button.onclick = () => {
        const cluster = review.clusters.find((candidate) => candidate.id === button.dataset.cluster)
        cluster.detections = cluster.detections.filter((face) => face.id !== button.dataset.remove)
        if (cluster.representativeId === button.dataset.remove) cluster.representativeId = cluster.detections[0]?.id
        review.clusters = review.clusters.filter((candidate) => candidate.detections.length)
        markDirty(); buildSuggestions(); render()
      })
      document.querySelectorAll('[data-hide]').forEach((button) => button.onclick = () => {
        const cluster = review.clusters.find((candidate) => candidate.id === button.dataset.hide)
        cluster.hidden = !cluster.hidden
        markDirty(); buildSuggestions(); render()
      })
      document.querySelectorAll('[data-expand]').forEach((button) => button.onclick = () => {
        expanded.has(button.dataset.expand) ? expanded.delete(button.dataset.expand) : expanded.add(button.dataset.expand)
        renderBrowser()
      })
      document.querySelectorAll('[data-move]').forEach((button) => button.onclick = () => openDestinationPicker({clusterId:button.dataset.cluster,faceId:button.dataset.move}))
      document.querySelectorAll('[data-merge]').forEach((button) => button.onclick = () => openDestinationPicker({clusterId:button.dataset.merge,wholeGroup:true}))
    }

    function openDestinationPicker(request) {
      moveRequest = request
      document.querySelector('#destination-search').value = ''
      renderDestinations()
      document.querySelector('#move-dialog').showModal()
      document.querySelector('#destination-search').focus()
    }

    function renderDestinations() {
      const query = document.querySelector('#destination-search').value.trim().toLowerCase()
      const source = review.clusters.find((cluster) => cluster.id === moveRequest.clusterId)
      const targets = review.clusters.filter((cluster) => cluster !== source && label(cluster).toLowerCase().includes(query))
      document.querySelector('#destination-list').innerHTML = targets.map((cluster) => {
        const cover = coverFor(cluster)
        return \`<button class="destination" data-destination="\${cluster.id}">
          \${cover ? \`<img src="\${cover.cropUrl}" alt="">\` : '<span></span>'}
          <span><strong>\${escapeHtml(label(cluster))}</strong><small class="person-meta">\${photoText(cluster)}</small></span>
          <span>Choose</span>
        </button>\`
      }).join('') || '<div class="empty">No matching person.</div>'
      document.querySelectorAll('[data-destination]').forEach((button) => button.onclick = () => {
        const target = review.clusters.find((cluster) => cluster.id === button.dataset.destination)
        if (moveRequest.wholeGroup) mergePeople(target,source)
        else moveFace(source.id,moveRequest.faceId,target.id)
        document.querySelector('#move-dialog').close()
      })
    }

    function render() {
      const totalFaces = review.clusters.reduce((total,cluster) => total + cluster.detections.length,0)
      document.querySelector('#stats').innerHTML = '<span class="stat"><strong>' + review.clusters.length + '</strong> people</span><span class="stat"><strong>' + totalFaces + '</strong> faces</span><span class="stat"><strong>' + suggestions.length + '</strong> suggestions</span>'
      document.querySelectorAll('[data-mode]').forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.mode === mode)))
      document.querySelectorAll('[data-filter]').forEach((button) => button.setAttribute('aria-pressed',String(button.dataset.filter === activeFilter)))
      document.querySelector('#queue').hidden = mode !== 'suggestions'
      document.querySelector('#browser').hidden = mode !== 'people'
      document.querySelector('#filters').hidden = mode !== 'people'
      document.querySelector('#tip').hidden = mode !== 'suggestions'
      if (mode === 'suggestions') renderQueue()
      else renderBrowser()
    }

    document.querySelectorAll('[data-mode]').forEach((button) => button.onclick = () => { mode = button.dataset.mode; render() })
    document.querySelectorAll('[data-filter]').forEach((button) => button.onclick = () => { activeFilter = button.dataset.filter; render() })
    document.querySelector('#new-group').onclick = () => {
      review.clusters.unshift({id:'person-manual-' + Date.now(),hidden:false,detections:[],representativeId:undefined,centroid:[]})
      markDirty(); render()
    }
    document.querySelector('#close-dialog').onclick = () => document.querySelector('#move-dialog').close()
    document.querySelector('#destination-search').oninput = renderDestinations
    document.querySelector('#save').onclick = async () => {
      const button = document.querySelector('#save')
      button.disabled = true
      button.textContent = 'Saving...'
      const response = await fetch('/review.json',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(review)})
      if (!response.ok) {
        document.querySelector('#save-state').textContent = 'Save failed'
      } else {
        dirty = false
        document.querySelector('#save-state').textContent = 'Saved locally'
      }
      button.disabled = false
      button.textContent = 'Save review'
    }
    document.addEventListener('keydown',(event) => {
      if (mode !== 'suggestions' || event.target.matches('input,select,textarea') || !suggestions.length) return
      if (event.key.toLowerCase() === 'y') document.querySelector('#same')?.click()
      if (event.key.toLowerCase() === 'n') document.querySelector('#different')?.click()
      if (event.key.toLowerCase() === 's') document.querySelector('#skip')?.click()
    })
    window.addEventListener('beforeunload',(event) => { if (dirty) { event.preventDefault(); event.returnValue = '' } })
    load()
  </script>
</body>
</html>`
}
