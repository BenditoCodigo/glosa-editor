# Tailwind CSS v4 - Guía de Uso Avanzado

Versión: Tailwind CSS 4.x (última estable, Oxide engine)
Integración: `@tailwindcss/vite` plugin para Vite + Vue 3

---

## Instalación y Setup

### Paquetes requeridos

```bash
pnpm add tailwindcss @tailwindcss/vite
```

### Plugin en Vite

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
})
```

### Punto de entrada CSS

```css
/* src/assets/styles/main.css */
@import "tailwindcss";
```

No se necesita `tailwind.config.js`. Toda la configuración es CSS-first.

---

## Directivas principales de Tailwind v4

### `@theme` — Definir design tokens

Define variables CSS que Tailwind convierte en utilidades automáticamente.
Todas las customizaciones de tema van aquí.

```css
@import "tailwindcss";

@theme {
  /* Colores personalizados → genera bg-primary, text-primary, border-primary, etc. */
  --color-primary: oklch(0.6 0.2 250);
  --color-surface: oklch(0.98 0.005 250);
  --color-surface-dark: oklch(0.12 0.01 250);

  /* Tipografía */
  --font-sans: 'Inter', sans-serif;
  --font-display: 'Space Grotesk', sans-serif;

  /* Radios */
  --radius-lg: 1rem;
  --radius-xl: 1.5rem;
  --radius-2xl: 2rem;

  /* Sombras personalizadas */
  --shadow-glass: 0 12px 40px rgba(0, 0, 0, 0.08);
  --shadow-glass-inner: inset 0px 2px 4px rgba(0, 0, 0, 0.15);

  /* Blur personalizado */
  --blur-glass-sm: 8px;
  --blur-glass-md: 16px;
  --blur-glass-lg: 24px;

  /* Spacing custom si se necesita */
  --spacing-18: 4.5rem;

  /* Animaciones */
  --animate-fade-in: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

**Regla**: Cualquier token que se repita más de 2 veces debe definirse en `@theme`.

### `@utility` — Crear utilidades personalizadas

Registra clases custom que se comportan como utilidades nativas de Tailwind
(responsive, hover, etc. funcionan automáticamente).

```css
@utility glass-panel {
  background: var(--bc-glass-bg-light);
  backdrop-filter: blur(var(--blur-glass-lg));
  border: 1px solid var(--bc-glass-border-light);
  box-shadow: var(--bc-glass-highlight), var(--bc-glass-shadow-soft);
}

@utility glass-input {
  background: var(--bc-glass-input-bg);
  box-shadow: var(--bc-glass-shadow-inner);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

@utility text-on-glass {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
}
```

Uso en template:
```html
<div class="glass-panel rounded-2xl p-6 text-on-glass">
  Contenido sobre cristal
</div>
```

### `@custom-variant` — Crear variantes personalizadas

Define variantes que se aplican como prefijos (igual que `hover:`, `dark:`, `md:`).

```css
/* Dark mode por clase (no por media query del sistema) */
@custom-variant dark (&:where(.dark, .dark *));
```

Esto permite: `dark:bg-surface-dark`, `dark:text-white`, etc.
Se activa añadiendo clase `dark` al `<html>`.

### `@variant` — Aplicar variantes existentes dentro de CSS

```css
@utility glass-panel {
  background: var(--bc-glass-bg-light);
  backdrop-filter: blur(var(--blur-glass-lg));
  border: 1px solid var(--bc-glass-border-light);
  box-shadow: var(--bc-glass-highlight), var(--bc-glass-shadow-soft);

  @variant dark {
    background: var(--bc-glass-bg-dark);
    border-color: var(--bc-glass-border-dark);
    box-shadow: var(--bc-glass-highlight);
  }
}
```

### `@source` — Indicar dónde buscar clases

Por defecto Tailwind detecta automáticamente archivos en el proyecto.
Usar solo si hay archivos fuera del tree normal:

```css
@source "../node_modules/some-component-lib/**/*.vue";
```

---

## Dark Mode

### Estrategia: Class-based (toggle manual)

En Tailwind v4, por defecto `dark:` usa `prefers-color-scheme` (media query del OS).
Para control manual con toggle, sobreescribir con `@custom-variant`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

### Uso en templates

```html
<!-- Se aplica automáticamente cuando <html class="dark"> -->
<div class="bg-white dark:bg-gray-900 text-gray-800 dark:text-white">
  Contenido adaptable
</div>
```

### Variables CSS para temas con Tailwind v4

Definir colores semánticos que cambien por tema:

```css
@theme {
  --color-surface: oklch(0.98 0.005 250);
  --color-surface-elevated: oklch(0.96 0.005 250);
  --color-text-primary: oklch(0.2 0.02 250);
  --color-text-secondary: oklch(0.4 0.02 250);
}

/* Sobreescribir en dark */
@variant dark {
  :root {
    --color-surface: oklch(0.12 0.01 250);
    --color-surface-elevated: oklch(0.16 0.01 250);
    --color-text-primary: oklch(0.95 0.005 250);
    --color-text-secondary: oklch(0.7 0.01 250);
  }
}
```

---

## Colores

### Formato: oklch (recomendado en v4)

Tailwind v4 usa `oklch` internamente. Seguir esta convención:

```css
@theme {
  --color-primary: oklch(0.6 0.2 250);      /* Azul vibrante */
  --color-primary-hover: oklch(0.55 0.22 250);
  --color-accent: oklch(0.7 0.18 330);      /* Rosa/magenta */
  --color-success: oklch(0.7 0.18 145);
  --color-warning: oklch(0.8 0.15 85);
  --color-error: oklch(0.6 0.22 25);
}
```

### Paleta de opacidades para glass (usar rgba/oklch con alpha)

```css
@theme {
  --color-glass-light: oklch(1 0 0 / 0.4);
  --color-glass-dark: oklch(0.1 0 0 / 0.5);
  --color-glass-border-light: oklch(1 0 0 / 0.6);
  --color-glass-border-dark: oklch(1 0 0 / 0.1);
}
```

---

## Responsive Design

### Breakpoints por defecto (no modificar a menos que sea necesario)

- `sm:` → 640px
- `md:` → 768px
- `lg:` → 1024px
- `xl:` → 1280px
- `2xl:` → 1536px

### Container Queries (nuevo en v4)

```html
<div class="@container">
  <div class="@md:grid-cols-2 @lg:grid-cols-3">
    <!-- Se adapta al tamaño del contenedor, no del viewport -->
  </div>
</div>
```

Útil para componentes del editor que deben adaptarse a su propio espacio.

---

## Transiciones y Animaciones

### Filosofía: Interfaces dinámicas sin glitches

Las animaciones son firma de Bendito Código. Cada transición debe sentirse fluida,
intencional y libre de artefactos visuales. Prioridad absoluta: **zero glitches**.

### Utilidades nativas aprovechables

```html
<!-- Transiciones suaves para hover/focus -->
<button class="transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]">
  Guardar nota
</button>

<!-- Animación de entrada -->
<div class="animate-fade-in">Nuevo elemento</div>
```

### `@starting-style` (nuevo en v4)

Para animaciones de entrada/salida sin JavaScript:

```css
@utility glass-modal {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s, transform 0.2s;

  @starting-style {
    opacity: 0;
    transform: translateY(8px);
  }
}
```

---

## Prevención de Glitches en Animaciones

### Regla 1: Siempre usar `will-change` antes de animar

Declarar `will-change` en el estado base del elemento que se va a animar.
Esto avisa al navegador que reserve una capa de composición **antes** de que
la animación inicie, evitando el "pop" de primer frame.

```html
<!-- ✅ Pre-promueve la capa -->
<div class="will-change-transform transition-transform duration-300 hover:translate-y-[-4px]">

<!-- ❌ Sin will-change, el navegador promueve a capa mid-animation = glitch -->
<div class="transition-transform duration-300 hover:translate-y-[-4px]">
```

**PERO**: No abusar. Solo en elementos que realmente se animan con frecuencia.
Demasiados `will-change` = consumo excesivo de VRAM.

### Regla 2: Animar SOLO propiedades compositable

Las únicas propiedades que el navegador anima sin repaint/reflow:

| Propiedad | Clase Tailwind | GPU-accelerated |
|-----------|---------------|-----------------|
| `transform` | `translate-*`, `scale-*`, `rotate-*` | ✅ Sí |
| `opacity` | `opacity-*` | ✅ Sí |
| `filter` | `blur-*`, `brightness-*` | ✅ Sí |
| `backdrop-filter` | `backdrop-blur-*` | ✅ Sí |

**NUNCA animar directamente:**
- `width`, `height` → usar `scale-*` en su lugar
- `top`, `left`, `right`, `bottom` → usar `translate-*`
- `margin`, `padding` → no animable sin reflow
- `border-radius` → causa repaint, no transicionar
- `box-shadow` → causa repaint; si es necesario, transicionar `opacity` de un pseudo-elemento con la sombra

### Regla 3: Transicionar propiedades específicas, no `all`

```html
<!-- ✅ Específico: solo anima lo necesario -->
<div class="transition-[transform,opacity] duration-200">

<!-- ⚠️ Aceptable para interacciones simples (hover sobre botones) -->
<div class="transition-all duration-200">

<!-- ❌ Problemático en elementos con muchas propiedades cambiantes -->
<div class="transition-all duration-500"> <!-- anima TODO incluido layout -->
```

`transition-all` es válido solo en componentes simples (botones, badges).
Para paneles, modales o elementos con glass: especificar propiedades explícitas.

### Regla 4: Evitar layout shift durante animaciones

```html
<!-- ✅ El elemento ya ocupa su espacio, solo se revela -->
<div class="opacity-0 translate-y-2 animate-fade-in">

<!-- ❌ Cambia de display:none a block = layout shift -->
<div v-if="show"> <!-- aparece de golpe, empuja contenido -->
```

Para entradas/salidas:
- Usar `v-show` + transición (el elemento siempre ocupa espacio)
- O usar Vue `<Transition>` con clases que solo animen `opacity` + `transform`

### Regla 5: Forzar GPU layer en elementos problemáticos

Cuando un elemento produce flickering o blinking al transicionar:

```html
<!-- Fuerza compositing layer sin will-change permanente -->
<div class="translate-z-0"> <!-- shorthand: transform: translateZ(0) -->
```

En Tailwind, usar `transform-gpu` que aplica `translate3d(0, 0, 0)`:

```html
<div class="transform-gpu transition-transform duration-200 hover:scale-105">
```

### Regla 6: `backdrop-filter` + transiciones = cuidado especial

`backdrop-filter` es costoso. Al transicionar elementos con glass:

```css
/* ✅ Transicionar solo opacity del panel, no el blur */
@utility glass-panel-animated {
  background: var(--bc-glass-bg-light);
  backdrop-filter: blur(var(--bc-glass-blur-lg));
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
  /* NO transicionar backdrop-filter */
}
```

- Nunca transicionar el valor de `backdrop-filter` (ej. blur(0) → blur(24px))
- En su lugar, transicionar la `opacity` del panel completo (0 → 1)
- O usar un pseudo-elemento con el blur y transicionar su opacity

### Regla 7: Vue `<Transition>` — naming y patrones

```vue
<Transition name="fade-up">
  <div v-if="show" class="glass-panel">...</div>
</Transition>
```

Las clases de transición van en el CSS global:

```css
/* En main.css */
.fade-up-enter-active,
.fade-up-leave-active {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.fade-up-enter-from,
.fade-up-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
```

Convención de nombres para transiciones Vue:
- `fade` — solo opacity
- `fade-up` — opacity + translateY desde abajo
- `fade-down` — opacity + translateY desde arriba
- `fade-scale` — opacity + scale desde 0.95
- `slide-left` — translateX desde la derecha
- `slide-right` — translateX desde la izquierda

### Regla 8: Duraciones consistentes

| Contexto | Duración | Easing |
|----------|----------|--------|
| Hover/Active states | 150-200ms | `ease-out` |
| Paneles entrando/saliendo | 200-300ms | `ease-out` |
| Modales/overlays | 200ms enter, 150ms leave | `ease-out` / `ease-in` |
| Sidebar toggle | 250-300ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| Page transitions | 200-250ms | `ease-out` |
| Drag & drop feedback | 150ms | `ease-out` |

**Regla**: Leave siempre más rápido que enter (se siente más responsivo).

### Regla 9: `prefers-reduced-motion` — accesibilidad

Respetar usuarios que desactivan animaciones:

```html
<!-- Las animaciones se desactivan automáticamente -->
<div class="motion-safe:animate-fade-in motion-safe:transition-all">
```

O a nivel global en el CSS:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Regla 10: Testing visual de animaciones

Antes de dar por terminada una animación:
1. Probar a 60fps sostenidos (DevTools → Performance → check frame drops)
2. Probar en throttled CPU (4x slowdown) — si glitchea ahí, glitcheará en móvil
3. Verificar que no hay flash blanco/negro al iniciar
4. Verificar que no hay "jump" en el primer frame
5. Verificar suavidad de arranque y frenado (no cortes abruptos)

---

## Patron de uso en componentes Vue

### Template-first con Tailwind (maximizar uso en template)

```vue
<template>
  <article class="glass-panel rounded-2xl p-6 transition-shadow duration-200 hover:shadow-lg">
    <h2 class="font-display text-xl font-semibold text-text-primary">
      {{ note.title }}
    </h2>
    <p class="mt-2 text-sm text-text-secondary line-clamp-3">
      {{ note.excerpt }}
    </p>
    <time class="mt-4 block text-xs text-text-secondary">
      {{ formattedDate }}
    </time>
  </article>
</template>
```

### Cuándo usar clases en template vs @utility

| Situación | Enfoque |
|-----------|---------|
| Estilos únicos de un elemento | Clases inline en template |
| Patrón repetido en 3+ lugares | Crear `@utility` |
| Componente complejo con estados | `@utility` + `@variant` |
| Override puntual | Clases inline |

### NO usar `@apply` en `<style scoped>`

`@apply` dentro de SFC scoped styles es problemático con Tailwind v4. Preferir:
1. Clases directas en el template
2. `@utility` en el CSS global
3. Solo usar `<style scoped>` para estilos que Tailwind no cubre (ej. Tiptap)

---

## Performance

### Lo que hace Tailwind v4 automáticamente

- Tree-shaking: solo genera CSS de las clases usadas
- Detección automática de archivos (no necesita `content` array)
- Compilación incremental en dev (microsegundos por cambio)
- Motor Oxide (Rust): builds 5-10x más rápidos que v3

### Buenas prácticas

- No importar frameworks CSS adicionales — Tailwind reemplaza todo
- Usar `will-change-transform` solo donde haya animaciones constantes
- Limitar `backdrop-filter` según las reglas del steering Liquid Glass
- Usar `contain-paint` / `contain-layout` en contenedores de scroll

---

## Convenciones del proyecto

1. **Un solo archivo de entrada**: `src/assets/styles/main.css`
2. **Orden del archivo CSS**:
   - `@import "tailwindcss"`
   - `@custom-variant` (dark mode)
   - `@theme` (tokens del proyecto)
   - `@utility` (utilidades glass y custom)
   - Estilos base adicionales (`@layer base`)
3. **No crear `tailwind.config.js`** — todo en CSS
4. **Usar `@tailwindcss/vite`** como plugin — no PostCSS manual
5. **Clases semánticas** via `@utility` para patrones glass repetitivos
6. **oklch** como formato de color preferido
7. **Container queries** para componentes que viven en paneles redimensionables
8. **`dark:`** variante con class strategy para toggle manual de tema

---

## Convención de orden de clases CSS en templates

### Orden obligatorio de clases Tailwind en atributos `class`

Seguir este orden lógico al escribir clases en el template:

```
[utility-custom] [layout] [sizing] [spacing] [typography] [visual] [interactive] [responsive] [dark]
```

#### Categorías en detalle:

1. **Utilidades custom** (`glass-panel`, `text-on-glass`, etc.)
2. **Layout** (`flex`, `grid`, `inline-flex`, `relative`, `absolute`, `z-*`)
3. **Sizing** (`w-*`, `h-*`, `min-*`, `max-*`)
4. **Spacing** (`p-*`, `m-*`, `gap-*`)
5. **Typography** (`font-*`, `text-*`, `leading-*`, `tracking-*`)
6. **Borders & Radius** (`border-*`, `rounded-*`)
7. **Visual** (`bg-*`, `shadow-*`, `opacity-*`, `backdrop-*`)
8. **Transitions & Animation** (`transition-*`, `duration-*`, `animate-*`)
9. **Interactive/States** (`hover:*`, `focus:*`, `active:*`, `disabled:*`)
10. **Responsive** (`sm:*`, `md:*`, `lg:*`)
11. **Dark mode** (`dark:*`)

#### Ejemplo aplicado:

```html
<!-- ✅ Orden correcto -->
<button class="glass-panel inline-flex items-center h-10 px-4 text-sm font-medium rounded-xl bg-primary text-white shadow-hard transition-all duration-200 hover:bg-primary-hover active:scale-[0.98] dark:bg-primary/90">
  Guardar
</button>

<!-- ❌ Orden caótico -->
<button class="hover:bg-primary-hover text-white h-10 glass-panel shadow-hard bg-primary px-4 inline-flex rounded-xl duration-200 text-sm items-center font-medium active:scale-[0.98] transition-all dark:bg-primary/90">
  Guardar
</button>
```

### Clases largas: cuándo partir en múltiples líneas

Si un atributo `class` supera ~80 caracteres, partir con line breaks lógicos:

```vue
<template>
  <article
    class="
      glass-panel
      flex flex-col
      w-full min-h-[120px]
      p-6 gap-3
      rounded-2xl
      transition-shadow duration-200
      hover:shadow-lg
    "
  >
    <!-- contenido -->
  </article>
</template>
```

### Uso de arrays dinámicos (`:class` binding)

Para clases condicionales, usar array syntax o computed:

```vue
<!-- Array con condicionales -->
<div :class="[
  'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
  isSelected && 'bg-primary/10 border-primary',
  !isSelected && 'hover:bg-black/5 dark:hover:bg-white/5',
]">

<!-- Computed para lógica compleja (en componentes UI) -->
<button :class="buttonClasses">
```

### Nombrado de `@utility` custom

Las utilidades creadas con `@utility` siguen esta convención:

| Prefijo | Uso | Ejemplo |
|---------|-----|---------|
| `glass-*` | Superficies con efecto Liquid Glass | `glass-panel`, `glass-input`, `glass-panel-md` |
| `text-on-*` | Estilos de texto sobre superficies especiales | `text-on-glass` |
| `layout-*` | Patrones de layout reutilizables | `layout-main`, `layout-sidebar` |
| `animate-*` | Animaciones custom (ya soportado por @theme) | `animate-fade-in` |

Nunca crear `@utility` para algo que se resuelve con 1-2 clases de Tailwind nativas.
