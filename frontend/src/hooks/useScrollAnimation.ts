import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useScrollAnimation() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Hero canvas fade out
    const canvas = document.getElementById('matrix-canvas');
    if (canvas) {
      gsap.to(canvas, {
        opacity: 0,
        scrollTrigger: {
          trigger: '.hero',
          start: 'bottom top',
          end: 'bottom+=50% top',
          scrub: true,
        },
      });
    }

    // Entrance animations for all sections
    const animatedSections = document.querySelectorAll('[data-animate]');
    animatedSections.forEach((section) => {
      const children = section.querySelectorAll('[data-animate-child]');
      if (children.length > 0) {
        gsap.fromTo(
          children,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 80%',
              toggleActions: 'play none none none',
            },
          }
        );
      }
    });

    // Stat cards stagger
    const statSection = document.querySelector('[data-stats]');
    if (statSection) {
      const stats = statSection.querySelectorAll('[data-stat]');
      gsap.fromTo(
        stats,
        { y: 30, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: statSection,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    // Use case cards
    const useCasesSection = document.querySelector('[data-usecases]');
    if (useCasesSection) {
      const cards = useCasesSection.querySelectorAll('[data-usecase-card]');
      gsap.fromTo(
        cards,
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: useCasesSection,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        }
      );
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);
}
