---
trigger: glob
globs:
  - "*.vue"
  - "*.css"
  - "*.ts"
description: "Playbook de diseño e implementación del Liquid Glass Design System (colores, blur, sombras, tipografía y rendimiento)."
---

# UI/UX - Liquid Glass Design System (Bendito Código)

Este steering define los lineamientos visuales para Glosa siguiendo el playbook
de Bendito Código: fusión de Glassmorphism con Liquid Glass.
La plataforma soporta tema oscuro y claro.

---

## Principio fundamental

Crear interfaces que se sientan como objetos físicos digitales, utilizando profundidad,
luz y movimiento para guiar al usuario sin perder limpieza estructural.

---

## Las 4 propiedades de un componente Liquid Glass

Todo componente con efecto glass DEBE combinar estas 4 propiedades:

1. **Translucidez (Superficie)**: Color base con baja opacidad
2. **Refracción (Backdrop Blur)**: Desenfoque del contenido detrás del elemento
3. **Luz Especular (Bordes)**: Borde interior semi-transparente que simula luz golpeando el cristal
4. **Sombra Dinámica (Profundidad)**: Box-shadow suave y coloreada

Si falta alguna, el efecto se rompe. No es solo "bajar la opacidad".

---

## Jerarquía de capas (Eje Z)

| Nivel | Uso | Blur | Notas |
|-------|-----|------|-------|
| 0 - Fondo | Canvas base | N/A | Gradientes fluidos, animaciones |
| 1 - Superficies Base | Sidebar, paneles grandes | 24px | Opacidad baja |
| 2 - Componentes Flotantes | Modales, tooltips, nav secundaria | 12px | Bordes especulares más definidos |
| 3 - Elementos de Acción | Botones, inputs | N/A | SÓLIDOS, nunca glass sobre glass |

### REGLA DE ORO
Nunca apilar más de 2 capas con `backdrop-filter` simultáneamente.

---

## Design Tokens (Variables CSS)

Los desarrolladores NO deben codificar opacidades a mano. Usar exclusivamente tokens `--bc-*`.

### Tokens de Superficie

```css
:root {
  /* Tema Claro (Cristal Esmerilado) */
  --bc-glass-bg-light: rgba(255, 255, 255, 0.4);
  --bc-glass-border-light: rgba(255, 255, 255, 0.6);

  /* Tema Oscuro (Cristal Ahumado) */
  --bc-glass-bg-dark: rgba(15, 15, 15, 0.5);
  --bc-glass-border-dark: rgba(255, 255, 255, 0.1);

  /* Inputs hundidos */
  --bc-glass-input-bg: rgba(0, 0, 0, 0.05);
}
```

### Tokens de Refracción (Blur)

```css
:root {
  --bc-glass-blur-sm: blur(8px);   /* Modales móviles, tooltips */
  --bc-glass-blur-md: blur(16px);  /* Elementos flotantes secundarios */
  --bc-glass-blur-lg: blur(24px);  /* Superficies base, sidebars */
}
```

### Tokens de Luz Especular and Sombra

```css
:root {
  /* Profundidad Tema Claro */
  --bc-glass-shadow-soft: 0 12px 40px rgba(0, 0, 0, 0.08);

  /* Profundidad Tema Oscuro / Inputs */
  --bc-glass-shadow-inner: inset 0px 2px 4px rgba(0, 0, 0, 0.15);

  /* Highlight direccional (luz superior-izquierda) */
  --bc-glass-highlight: inset 1px 1px 0px rgba(255, 255, 255, 0.2);
}
```

---

## Gestión de Temas

### Light Mode (Cristal Esmerilado)
- El fondo NUNCA es blanco puro — usar tonos ultra-claros con gradientes sutiles
- Profundidad con sombras de caída amplias (frías o cálidas)
- Texto: gris oscuro absorbente, nunca negro absoluto (#000)

### Dark Mode (Cristal Ahumado)
- Las sombras de caída no funcionan sobre negro
- Profundidad con bordes especulares iluminados (blanco al 10-15%) y superposición de opacidades
- Texto: blanco puro

### Implementación en Tailwind/CSS
Usar la clase `dark` en el `<html>` y alternar tokens según el tema activo.

---

## Tipografía

El fondo cristalino reduce el contraste, la tipografía debe ser robusta.

### Pairing para este proyecto (Tech/Herramientas)
- **Titulares**: Space Grotesk (geométrica, impactante)
- **Cuerpo/UI**: Inter (legibilidad perfecta en tamaños pequeños)
- **Código**: Geist Mono (monoespaciada moderna para code blocks)
- Importar desde Google Fonts
- Iconos: Material Symbols Outlined (variable weight 300, FILL 0)

### Escala tipográfica

| Token | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| headline-lg | Space Grotesk | 48px | 700 | 1.1 |
| headline-md | Space Grotesk | 32px | 600 | 1.2 |
| headline-sm | Space Grotesk | 24px | 600 | 1.3 |
| body-lg | Inter | 18px | 400 | 1.6 |
| body-md | Inter | 16px | 400 | 1.5 |
| body-sm | Inter | 14px | 400 | 1.4 |
| label-md | Inter | 14px | 600 | 1.0 |
| label-sm | Inter | 12px | 500 | 1.0 |
| mono-code | Geist Mono | 14px | 400 | 22px |

### Renderizado obligatorio sobre glass

```css
.text-on-glass {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-shadow: 0px 1px 2px rgba(0, 0, 0, 0.1);
}
```

---

## Catálogo de Componentes

### Botones (CTAs)
- SÓLIDOS y táctiles — nunca glass sobre glass
- Pueden llevar sombra dura para contrastar: `box-shadow: 0 4px 0 rgba(0,0,0,0.8)`
- Alto contraste para accesibilidad

### Inputs y Textareas
- Simular hundimiento (Neumorfismo invertido), no cristal que "sobresale"
- Fondo semi-transparente oscuro con sombra interior:
  `box-shadow: inset 0px 2px 4px rgba(0,0,0,0.15)`

### Tarjetas (Cards)
- Bordes muy redondeados o "Squircles": `border-radius: 24px`
- Borde especular en lado superior e izquierdo (fuente de luz global)
- Aplicar las 4 propiedades glass completas

### Contenedores de tarjetas (fórmula de border-radius)
Cuando un contenedor glass envuelve hijos con border-radius, aplicar la fórmula:

**`border-radius del padre = border-radius del hijo + padding del padre`**

Ejemplo: hijos con `rounded-2xl` (24px) dentro de un padre con `p-8` (32px)
→ padre debe usar `rounded-[3.5rem]` (56px) o un valor cercano como `rounded-[2.5rem]` (40px)

Esto evita que el radio del padre "corte" visualmente el radio del hijo y mantiene
la coherencia óptica del efecto glass.

---

## Rendimiento y Responsive (Mobile First)

`backdrop-filter` es costoso para la GPU.

### Degradación elegante (fallback obligatorio)

```css
.glass-panel {
  /* Fallback si no hay soporte */
  background: rgba(255, 255, 255, 0.7);
}

@supports (backdrop-filter: blur(10px)) {
  .glass-panel {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(24px);
  }
}
```

### Breakpoint móvil (< 768px)
1. Reducir blur a la mitad (máx 10px)
2. Prohibido apilar elementos de cristal — modales y menús con fondos sólidos
3. No usar múltiples `backdrop-filter` simultáneos

---

## Reglas de implementación para este proyecto

1. Todos los valores de glass se consumen vía tokens `--bc-*`, nunca hardcodeados
2. Los componentes `ui/` base deben respetar la jerarquía de capas
3. El editor de notas (Tiptap) vive sobre una superficie Nivel 1 (glass-panel-md); sus controles son Nivel 3 (sólidos)
4. El sidebar de navegación de notas es Nivel 1 (glass-panel)
5. Modales de confirmación o settings son Nivel 2
6. Siempre proveer fallback para `backdrop-filter` (via `-webkit-backdrop-filter`)
7. En dark mode, reemplazar sombras por bordes especulares
8. Mantener contraste WCAG AA mínimo en texto sobre superficies glass
9. El fondo base (Level 0) es un gradiente fluido animado (`bg-fluid-gradient`) — no un color sólido
10. La paleta principal es sage green (#4f6056) — transmite calma y enfoque
11. La toolbar flotante del editor aparece en hover/focus — no ocupa espacio permanente
12. El sidebar usa navegación fija: All Notes, Recent, Favorites, Folders, Archive
13. Iconografía: Material Symbols Outlined (weight 300, FILL 0, optical size 20)
