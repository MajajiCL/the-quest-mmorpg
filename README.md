# 🪐 THE QUEST — Open-Source Interplanetary MMORPG (Level 1–100)

**THE QUEST** es un MMORPG interplanetario fotorrealista multiplataforma (PC + Móvil Táctil) construido con **Three.js (PBR / HDRI / Draco / Post-Processing)** y un servidor autoritativo espacial (**WebSockets + Spatial Hash Grid AoI**) capaz de sincronizar **500+ jugadores concurrentes**.

---

## ✨ Características Principales

1. **Sistema Solar Continuo (Tierra, Luna, Marte y Planeta Anillado Aurelia):**
   * Navega por la superficie de la **Tierra** (Santuario del Sol, Cañón del Horizonte, Catacumbas de Warkarma, Coliseo de Obsidiana y Ciudadela Flotante).
   * Asciende por la estratosfera (`Altitud > 135m`) hasta cruzar al **Espacio Profundo** y aterrizar en **La Luna (Selene)**, **Marte (Ares Prime)** o los anillos de **Aurelia**.
2. **Economía de Transporte y 5 Niveles de Locomoción:**
   * Viaja gratis a pie o en tu **Corcel Imperial** (`🐎`).
   * Compra con **Créditos de Éter (`✦`)** obtenidos jugando: **Supercar GT (`🏎️` 400 ✦)**, **Ave Mítica Solar (`🦅` 650 ✦)**, **Avión Caza Atmosférico (`✈️` 1,200 ✦)** o **Nave Espacial Interplanetaria (`🚀` 2,500 ✦)**.
   * O paga peajes instantáneos en la **Red de Teletransporte Interplanetario (`🪐 Carta Estelar`)**.
3. **Progresión RPG de Nivel 1 al 100 (Tope Estricto) y Códice de Habilidades (`🧬`):**
   * Gana **XP** extrayendo cristales planetarios, superando carreras contrarreloj, resolviendo juicios del **Arconte IA** o derrotando rivales.
   * Cada nivel (hasta el **Nivel 100**) otorga **+1 Punto de Habilidad** para invertir en:
     * **Impulso Cinético:** +6% velocidad terrestre, aérea y espacial por rango.
     * **Resonancia de Éter:** +15% rendimiento de minería/XP y daño de pulso por rango.
     * **Coraza Inmortal:** +25 HP máximos por rango.
     * **Navegación Astral:** Hasta 50% de descuento en peajes interplanetarios.
4. **6 Linajes Humanos Fotorrealistas + Importador `.GLB`:**
   * Elige en la galería 3D en vivo entre *Comandante Vanguard*, *Elena Verne*, *Espectro de Obsidiana*, *Kael Nomad*, *Guardián del Sol*, *Centinela Aegis*, o sube tu propio modelo `.glb`.

---

## 🚀 Ejecución Rápida (Desarrollo y Producción)

```bash
npm install
npm run build
npm start
```

* **Cliente WebGL & Servidor Multijugador:** `http://localhost:3000`
* **Benchmark de 500 Jugadores Simultáneos:** `npm run stress-test`

---

## 🤝 Cómo Contribuir (Comunidad Open Source)

1. Haz un **Fork** de este repositorio en GitHub.
2. Crea una rama para tu nueva misión, planeta, vehículo o habilidad (`git checkout -b feature/nuevo-planeta`).
3. Envía un **Pull Request (PR)**. El flujo de **GitHub Actions (`.github/workflows/deploy.yml`)** compilará y publicará automáticamente el cliente en **GitHub Pages** mientras tus 2 servidores privados alojan el motor multijugador en vivo.
