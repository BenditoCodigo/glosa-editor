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
