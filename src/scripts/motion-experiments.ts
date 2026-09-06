import gsap from 'gsap'
import { Flip } from 'gsap/Flip'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function initializeMotionExperiments(enabled: boolean) {
  gsap.registerPlugin(Flip, ScrollTrigger)
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('[data-project-filters]'),
  )
  let filtering: gsap.core.Timeline | undefined
  const filters = document.querySelector<HTMLElement>(
    '[data-portfolio-filters]',
  )
  if (filters) filters.hidden = false
  document
    .querySelectorAll<HTMLButtonElement>('[data-filter]')
    .forEach((button) => {
      button.addEventListener('click', () => {
        filtering?.progress(1)
        ScrollTrigger.getAll().forEach((trigger) => {
          if (cards.includes(trigger.trigger as HTMLElement))
            trigger.animation?.progress(1)
        })
        const state = enabled && !reduced.matches ? Flip.getState(cards) : null
        cards.forEach((card) => {
          card.hidden =
            button.dataset.filter !== 'all' &&
            !card.dataset.projectFilters
              ?.split(' ')
              .includes(button.dataset.filter!)
        })
        document
          .querySelectorAll('[data-filter]')
          .forEach((item) =>
            item.setAttribute('aria-pressed', String(item === button)),
          )
        document.querySelector('[data-filter-count]')!.textContent =
          `${cards.filter((card) => !card.hidden).length} projects`
        if (state) {
          filtering = Flip.from(state, {
            duration: 0.65,
            ease: 'power2.inOut',
            scale: true,
            onEnter: (elements) =>
              gsap.fromTo(
                elements,
                { opacity: 0 },
                { opacity: 1, duration: 0.4, clearProps: 'opacity' },
              ),
            onComplete: () => ScrollTrigger.refresh(),
          })
        } else ScrollTrigger.refresh()
      })
    })
  reduced.addEventListener('change', () => filtering?.progress(1))

  const panels = Array.from(
    document.querySelectorAll<HTMLElement>('[data-comparison-panel]'),
  )
  const controls = document.querySelector<HTMLElement>(
    '[data-comparison-controls]',
  )
  if (controls) {
    controls.hidden = false
    document
      .querySelector('[data-comparison]')!
      .classList.remove('lg:grid-cols-2')
    panels.forEach((panel, index) => {
      panel.hidden = index !== 0
    })
    document
      .querySelectorAll<HTMLButtonElement>('[data-comparison-select]')
      .forEach((button) => {
        button.addEventListener('click', () => {
          panels.forEach((panel, index) => {
            gsap.killTweensOf(panel)
            panel.hidden = index !== Number(button.dataset.comparisonSelect)
            // Unload a hidden player so an episode cannot keep playing off screen.
            panel.querySelectorAll('iframe').forEach((frame) => {
              if (panel.hidden && frame.getAttribute('src')) {
                frame.dataset.pausedSrc = frame.src
                frame.removeAttribute('src')
              } else if (!panel.hidden && frame.dataset.pausedSrc) {
                frame.src = frame.dataset.pausedSrc
                delete frame.dataset.pausedSrc
              }
            })
            if (!panel.hidden)
              gsap.fromTo(
                panel,
                {
                  opacity: enabled && !reduced.matches ? 0 : 1,
                  x: enabled && !reduced.matches ? 20 : 0,
                },
                {
                  opacity: 1,
                  x: 0,
                  duration: enabled && !reduced.matches ? 0.5 : 0,
                  clearProps: 'opacity,transform',
                },
              )
          })
          controls
            .querySelectorAll('button')
            .forEach((item) =>
              item.setAttribute('aria-pressed', String(item === button)),
            )
          ScrollTrigger.refresh()
        })
      })
  }

  const walkthrough = document.querySelector<HTMLElement>('[data-walkthrough]')
  if (walkthrough && enabled) {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const progress = walkthrough.querySelector<HTMLElement>(
        '[data-walkthrough-progress]',
      )!
      progress.hidden = false
      walkthrough.dataset.walkthroughReady = 'true'
      const steps = walkthrough.querySelectorAll('ol > li')
      const labels = [
        '01 / Plan',
        '02 / Film and record',
        '03 / Finished production',
      ]
      gsap.fromTo(
        walkthrough.querySelector('[data-walkthrough-bar]'),
        { scaleX: 0 },
        {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: walkthrough.querySelector('ol'),
            start: 'top 65%',
            end: 'bottom 65%',
            scrub: 0.3,
            onUpdate: (self) => {
              walkthrough.querySelector(
                '[data-walkthrough-label]',
              )!.textContent =
                labels[Math.min(2, Math.floor(self.progress * 3))]
            },
          },
        },
      )
      steps.forEach((step) =>
        gsap.from(step, {
          x: 24,
          ease: 'none',
          scrollTrigger: {
            trigger: step,
            start: 'top 90%',
            end: 'top 55%',
            scrub: true,
          },
        }),
      )
      return () => {
        progress.hidden = true
        delete walkthrough.dataset.walkthroughReady
      }
    })
  }

  // Native navigation still works if session storage is unavailable.
  const storageKey = 'portfolio-photo-transition'
  try {
    const raw = sessionStorage.getItem(storageKey)
    sessionStorage.removeItem(storageKey)
    const saved = raw ? JSON.parse(raw) : null
    const hero = document.querySelector<HTMLElement>('[data-motion-hero]')
    if (
      enabled &&
      !reduced.matches &&
      hero &&
      saved &&
      saved.path === location.pathname &&
      Date.now() - saved.time < 10000 &&
      saved.viewport === innerWidth &&
      [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite) &&
      saved.width > 0 &&
      saved.height > 0 &&
      /^https?:\/\//.test(saved.src)
    ) {
      hero.removeAttribute('data-reveal')
      const bounds = hero.getBoundingClientRect()
      const photo = document.createElement('div')
      photo.setAttribute('aria-hidden', 'true')
      photo.dataset.photoTransition = 'true'
      Object.assign(photo.style, {
        position: 'fixed',
        zIndex: '100',
        pointerEvents: 'none',
        backgroundImage: `url(${JSON.stringify(saved.src)})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      })
      document.body.appendChild(photo)
      const animation = gsap.fromTo(
        photo,
        {
          left: saved.x,
          top: saved.y,
          width: saved.width,
          height: saved.height,
        },
        {
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          duration: 0.7,
          ease: 'power3.inOut',
          onComplete: () => {
            gsap.to(photo, {
              opacity: 0,
              duration: 0.2,
              onComplete: () => photo.remove(),
            })
          },
        },
      )
      addEventListener(
        'pagehide',
        () => {
          animation.kill()
          photo.remove()
        },
        { once: true },
      )
      reduced.addEventListener(
        'change',
        () => {
          animation.kill()
          photo.remove()
        },
        { once: true },
      )
    }
  } catch {
    /* Storage is optional; continue with the normal page entrance. */
  }
  cards.forEach((card) => {
    card.querySelector('a')?.addEventListener('click', (event) => {
      if (
        !enabled ||
        reduced.matches ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const image = card.querySelector('img')
      if (!image) return
      const rect = image.getBoundingClientRect()
      try {
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({
            path: new URL((event.currentTarget as HTMLAnchorElement).href)
              .pathname,
            src: image.currentSrc,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            viewport: innerWidth,
            time: Date.now(),
          }),
        )
      } catch {
        /* Do not delay navigation when storage is blocked. */
      }
    })
  })
}
