---
name: Serene Liquid
colors:
  surface: '#f9f9f8'
  surface-dim: '#d9dad9'
  surface-bright: '#f9f9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f3'
  surface-container: '#edeeed'
  surface-container-high: '#e7e8e7'
  surface-container-highest: '#e1e3e2'
  on-surface: '#191c1c'
  on-surface-variant: '#434844'
  inverse-surface: '#2e3131'
  inverse-on-surface: '#f0f1f0'
  outline: '#737874'
  outline-variant: '#c3c8c3'
  surface-tint: '#516258'
  primary: '#4f6056'
  on-primary: '#ffffff'
  primary-container: '#67796e'
  on-primary-container: '#f5fff7'
  inverse-primary: '#b8cbbf'
  secondary: '#506357'
  on-secondary: '#ffffff'
  secondary-container: '#d2e8d8'
  on-secondary-container: '#56695c'
  tertiary: '#545e59'
  on-tertiary: '#ffffff'
  tertiary-container: '#6d7772'
  on-tertiary-container: '#f5fff9'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d4e7da'
  primary-fixed-dim: '#b8cbbf'
  on-primary-fixed: '#0f1f17'
  on-primary-fixed-variant: '#3a4a41'
  secondary-fixed: '#d2e8d8'
  secondary-fixed-dim: '#b7ccbd'
  on-secondary-fixed: '#0d1f16'
  on-secondary-fixed-variant: '#384b40'
  tertiary-fixed: '#dbe5df'
  tertiary-fixed-dim: '#bfc9c3'
  on-tertiary-fixed: '#151d1a'
  on-tertiary-fixed-variant: '#3f4944'
  background: '#f9f9f8'
  on-background: '#191c1c'
  surface-variant: '#e1e3e2'
  glass-bg-light: rgba(255, 255, 255, 0.4)
  glass-border-light: rgba(255, 255, 255, 0.6)
  glass-bg-dark: rgba(15, 15, 15, 0.5)
  glass-border-dark: rgba(255, 255, 255, 0.1)
  glass-input-bg: rgba(0, 0, 0, 0.05)
typography:
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.4'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
  max-width: 1280px
---

## Brand & Style
The design system evolves the "Serene Focus" identity into a physical digital object through the **Liquid Glass** aesthetic. The personality is calm, meditative, and high-end, evoking the feeling of interacting with polished, frosted materials that exist within a light-filled space. 

The style sits at the intersection of **Minimalism** and **Glassmorphism**, emphasizing structural clarity while using light refraction and translucency to create depth. It aims to reduce cognitive load by using soft, organic movement and a tactile feel that makes the digital interface feel tangible and responsive.

**Key Brand Pillars:**
- **Clarity through Depth:** Using layers to prioritize focus without visual clutter.
- **Organic Tactility:** Soft edges and light-based affordances.
- **Serene Presence:** A muted, nature-inspired palette that feels premium and intentional.

## Colors
The palette is anchored by a desaturated sage green (`#7a8c81`), which provides a sense of calm and natural equilibrium. 

### Color Application on Glass
To maintain the "Liquid" feel, brand colors should be applied as tinted overlays rather than solid fills. 
- **Primary Tint:** Use the primary color at 5-10% opacity for surface tints to create a "tinted glass" effect.
- **Accessibility:** Text on glass surfaces must use the high-contrast neutrals (Deep Charcoal for light mode, Pure White for dark mode) to meet WCAG AA standards. 
- **Dark Mode:** Shadows are replaced by vibrant specular highlights (inner borders) to define edges against dark backgrounds.

## Typography
Typography must be robust to remain legible against refracting backgrounds. **Space Grotesk** is used for headlines to provide a technical, modern edge that cuts through the soft glass surfaces. **Inter** handles all UI and body text, ensuring maximum readability.

**Rendering on Glass:**
All text placed on glass surfaces should apply `-webkit-font-smoothing: antialiased` and a very subtle `0px 1px 2px rgba(0, 0, 0, 0.1)` text-shadow. This prevents the "bleeding" effect common in glassmorphism and maintains sharp character edges. Headlines should use tighter letter-spacing to feel more "solid" as objects.

## Layout & Spacing
The layout follows a **fluid grid** model with generous margins to allow the glass surfaces "room to breathe." 

- **Grid:** 12-column system for desktop, 4-column for mobile.
- **Rhythm:** An 8px linear scale is used for component internal spacing, while a larger 24px gutter defines the separation between glass panels.
- **Floating Logic:** Panels (Level 1 and 2) should never touch the edge of the viewport on desktop; they should appear to "float" over the base canvas (Level 0). On mobile, panels can extend to the edges to maximize space, but they lose their `backdrop-filter` in favor of solid surfaces to preserve performance.

## Elevation & Depth
Elevation is achieved through the interaction of the four Liquid Glass properties: Translucency, Refracion, Specular Light, and Dynamic Shadows.

**Z-Axis Hierarchy:**
- **Level 0 (Base Canvas):** Fluid gradients using the primary color palette. No blur.
- **Level 1 (Surface Base):** Sidebars and large panels. `24px` backdrop-blur. 40% opacity. Large, soft ambient shadows.
- **Level 2 (Floating):** Modals, tooltips, and popovers. `12px` backdrop-blur. 50% opacity. Defined specular highlight on the top-left edge (1px white at 20% opacity).
- **Level 3 (Action Elements):** Buttons and inputs. **Solid** fills. These act as the "physical" touchpoints.

**Shadow Character:**
Shadows in light mode are wide and desaturated (`rgba(0, 0, 0, 0.08)`). In dark mode, shadows are largely discarded in favor of increased inner-border (specular) brightness to define depth.

## Shapes
The shape language is organic and soft, utilizing "Squircle" properties where possible. 
- **Large Panels:** Use `rounded-xl` (1.5rem / 24px) to emphasize the "liquid" feel.
- **Standard Components:** Use `rounded-lg` (1rem / 16px) for cards and buttons.
- **Small Elements:** Tooltips and tags use `rounded` (0.5rem / 8px).

Avoid sharp 90-degree corners entirely, as they break the physical metaphor of molded glass and liquid.

## Components

### Buttons (CTAs)
Buttons must be **solid** and tactile. They do not use glass effects. For primary actions, use the primary color (`#7a8c81`) with white text. For secondary actions, use a solid neutral-light background. Apply a "hard" shadow (`0 4px 0 rgba(0,0,0,0.1)`) to give them a pressed-down feel upon interaction.

### Inputs & Textareas
Inputs use a "sunken" neomorphic effect. Use the `glass-input-bg` with an inner shadow: `inset 0px 2px 4px rgba(0, 0, 0, 0.15)`. This distinguishes them as interactive wells within the glass panels.

### Cards
Cards are the primary container. They must implement all 4 glass properties. The top and left borders should be slightly brighter (`--bc-glass-highlight`) to simulate a global light source from the top-left.

### Lists & Navigation
Sidebar items (Level 1) should use high-contrast text. Active states should be indicated by a solid color "pill" behind the text or a high-contrast accent bar, rather than changing the glass property of the list item itself.

### Chips & Tags
Chips follow the Level 3 rule: they are solid, low-profile elements that sit on top of glass surfaces. Use the tertiary color (`#cbd5cf`) for backgrounds to maintain the "Serene" aesthetic without adding visual weight.