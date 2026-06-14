import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ensures light mode is always used by removing the dark class from the document element.
 * This can be called from any component that needs to ensure light mode.
 */
export function ensureLightMode() {
  if (typeof document !== 'undefined') {
    // Always set dark mode to false
    document.documentElement.classList.toggle('dark', false);
  }
}

/**
 * Removes any dark mode classes from a className string
 * @param className The class string to process
 * @returns The class string with dark mode classes removed
 */
export function removeDarkClasses(className: string): string {
  return className
    .split(' ')
    .filter(cls => !cls.startsWith('dark:'))
    .join(' ');
}

/**
 * Self-healing selector query tool.
 * Evaluates primary selectors, parent-child anchors, attribute patterns, and semantic text content to find elements.
 */
export class SelfHealingSelector {
  /**
   * Find an element with self-healing rules.
   */
  static query(config: {
    primary: string[];
    fallbackTags?: string[];
    attributes?: Record<string, string | RegExp>;
    textContent?: string | RegExp;
    parentSelector?: string;
    childSelector?: string;
    validate?: (el: HTMLElement) => boolean;
  }): HTMLElement | null {
    // 1. Try primary selectors
    for (const selector of config.primary) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const htmlEl = el as HTMLElement;
          if (this.isValid(htmlEl, config)) {
            return htmlEl;
          }
        }
      } catch (e) {
        // Skip invalid selector
      }
    }

    // 2. Try parent-child anchor backup
    if (config.parentSelector && config.childSelector) {
      try {
        const parents = document.querySelectorAll(config.parentSelector);
        for (const parent of Array.from(parents)) {
          const child = parent.querySelector(config.childSelector);
          if (child) {
            const htmlEl = child as HTMLElement;
            if (this.isValid(htmlEl, config)) {
              console.log('🔄 Self-Heal: Found element using parent-child anchor', { parent: config.parentSelector, child: config.childSelector });
              return htmlEl;
            }
          }
        }
      } catch (e) {}
    }

    // 3. Fallback tags scanning with attribute & text matching
    if (config.fallbackTags || config.attributes || config.textContent) {
      const tags = config.fallbackTags || ['button', 'a', 'div', 'span', 'p'];
      for (const tag of tags) {
        try {
          const elements = document.getElementsByTagName(tag);
          for (const el of Array.from(elements)) {
            const htmlEl = el as HTMLElement;
            
            // Check visibility
            if (htmlEl.offsetHeight === 0 && htmlEl.offsetWidth === 0) continue;
            
            // Validate attributes
            let attrMatch = true;
            if (config.attributes) {
              for (const [attrName, attrValue] of Object.entries(config.attributes)) {
                const actualValue = htmlEl.getAttribute(attrName) || '';
                if (attrValue instanceof RegExp) {
                  if (!attrValue.test(actualValue)) attrMatch = false;
                } else if (actualValue !== attrValue) {
                  attrMatch = false;
                }
              }
            }

            // Validate text content
            let textMatch = true;
            if (config.textContent) {
              const text = htmlEl.textContent?.trim() || '';
              if (config.textContent instanceof RegExp) {
                if (!config.textContent.test(text)) textMatch = false;
              } else if (!text.toLowerCase().includes(config.textContent.toLowerCase())) {
                textMatch = false;
              }
            }

            if (attrMatch && textMatch && this.isValid(htmlEl, config)) {
              console.log('🔄 Self-Heal: Found element matching tag + attributes + text criteria', { tag, textContent: String(config.textContent) });
              return htmlEl;
            }
          }
        } catch (e) {}
      }
    }

    return null;
  }

  private static isValid(el: HTMLElement, config: any): boolean {
    if (config.validate) {
      return config.validate(el);
    }
    return true;
  }
}
