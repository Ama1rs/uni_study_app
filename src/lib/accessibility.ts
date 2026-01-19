// Accessibility utilities and helpers

export const setupAccessibility = () => {
  // Focus management
  const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  
  // Announce to screen readers
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  // Focus trap utility
  const trapFocus = (element: HTMLElement) => {
    const focusable = element.querySelectorAll(focusableElements) as NodeListOf<HTMLElement>;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    element.addEventListener('keydown', handleKeydown);
    
    return () => {
      element.removeEventListener('keydown', handleKeydown);
    };
  };

  // Check color contrast
  const getContrastRatio = (color1: string, color2: string): number => {
    // Simple contrast ratio calculation
    const getLuminance = (color: string): number => {
      const rgb = parseInt(color.slice(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(color1);
    const l2 = getLuminance(color2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };

  // Validate ARIA attributes
  const validateAria = () => {
    const issues: string[] = [];
    
    // Check for missing alt text
    const imagesWithoutAlt = document.querySelectorAll('img:not([alt])');
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length} images missing alt text`);
    }

    // Check for proper heading structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName.substring(1));
      if (level > lastLevel + 1) {
        issues.push(`Heading level skip: h${lastLevel} to h${level}`);
      }
      lastLevel = level;
    });

    // Check for proper form labels
    const inputsWithoutLabels = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    const unlabeledInputs = Array.from(inputsWithoutLabels).filter(input => {
      const id = input.getAttribute('id');
      return !id || !document.querySelector(`label[for="${id}"]`);
    });
    
    if (unlabeledInputs.length > 0) {
      issues.push(`${unlabeledInputs.length} form inputs missing labels`);
    }

    return issues;
  };

  return {
    announceToScreenReader,
    trapFocus,
    getContrastRatio,
    validateAria,
    focusableElements
  };
};

// Visually hidden class
export const visuallyHidden = 'sr-only';