# 🪐 THE QUEST — Open-Source Interplanetary & Maritime MMORPG (Level 1–100)

[![Play Live](https://img.shields.io/badge/PLAY_NOW-GitHub_Pages-gold?style=for-the-badge&logo=google-chrome&logoColor=white)](https://majajicl.github.io/the-quest-mmorpg/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Multiplayer: WebSocket + Spatial AoI](https://img.shields.io/badge/Engine-Three.js_WebGL-teal?style=for-the-badge)](https://majajicl.github.io/the-quest-mmorpg/)

🎮 **JUEGA EN VIVO DIRECTO EN TU NAVEGADOR (PC O MÓVIL TÁCTIL, SIN INSTALAR NADA):**  
👉 **[https://majajicl.github.io/the-quest-mmorpg/](https://majajicl.github.io/the-quest-mmorpg/)**

---

**THE QUEST** es un MMORPG interplanetario y marítimo fotorrealista multiplataforma (**PC + Móvil Táctil**) construido con **Three.js (PBR / HDRI / Draco / Post-Processing / Water Shader)** y un motor dual híbrido:
1. **Modo Soberano Autónomo (Web):** Juega al instante en GitHub Pages con persistencia local en tu navegador (`localStorage`), monstruos de mundo abierto, jefes de incursión (Raid Bosses), árbol de 6 estadísticas estilo *Ragnarok*, Forja Primordial `+0` a `+15` y Alas Evolucionadas estilo *MU*, navegación en Galeón naval y saltos cuánticos entre mundos sin requerir servidor externo.
2. **Modo Multijugador Autoritativo:** Servidor espacial dedicado con WebSockets y Spatial Hash Grid AoI capaz de sincronizar **500+ jugadores concurrentes**.

---

## ✨ Características Principales

1. **Océano Vivo, Puerto Naval Imperial, Islas del Archipiélago y Galeones 3D (`[6]`):**
   * **Playas Doradas y Muelle de Madera Dura (`Puerto Sur`, `0, 0, +86`):** Con bolardos de amarre, **Faro Imperial de 22m** con haz de luz giratorio y flota de barcos navegando en tiempo real sobre el océano con física de oleaje.
   * **6ª Montura Gratuita — Galeón Naval de 3 Mástiles (`⛵ [6]` / `Sail_ship.glb`):** El capitán va visible al timón en el alcázar de popa mientras surcas el mar hacia la **Isla del Dragón Abisal (`0, 0, +185`)** (hogar del *Raid Boss Marino Dragón Leviatán Nv.38*, modelo 3D `DragonAttenuation.glb`) y la **Isla del Arrecife Dorado (`+165, 0, +110`)**.
2. **Paisajismo 3D Completo ("Cero Geometría en Bruto"):**
   * Más de **56 árboles 3D reales (`tree.glb`)** en jardines imperiales, avenidas, costas y archipiélagos.
   * **Espejos de Agua Turquesa**, **Estatuas Guardianas de Dragón en Oro Antiguo**, **Farolas Imperiales Cálidas** y **Partículas Flotantes de Éter**.
3. **Sistema Solar Continuo con Geometría Planetaria Unificada (Sin Cortes):**
   * Terrenos esféricos esculpidos de una sola pieza con cráteres naturales y halo atmosférico para **La Luna (Selene)**, **Marte (Ares Prime)** y el planeta anillado **Aurelia**.
4. **Postura Biomecánica Sentada Real en Cabinas y Monturas (`[1]` a `[6]`):**
   * Articulación esquelética en tiempo real de fémures, rodillas y brazos para que el personaje se vea **sentado** cabalgando en el **Corcel (`[1]`)**, al volante del **Ferrari GT (`[2]`)**, sobre el **Ave Solar (`[3]`)**, dentro de la cabina de cristal del **Caza Supersónico (`[4]`, `jet_fighter.glb`)**, en el puente del **Crucero Espacial (`[5]`)** o al timón del **Galeón Naval (`[6]`)**.
5. **Fusión RPG Clásica (*Ragnarok Online* + *MU Online* + *Lineage II*):**
   * **6 Atributos estilo *Ragnarok Online* (`[K]`):** `STR`, `AGI`, `VIT`, `INT`, `DEX`, `LUK` (+5 puntos por nivel hasta Nv.100).
   * **Forja del Caos `+0` a `+15` y Alas 3D Evolucionadas estilo *MU Online* (`[F]`):** Mejora tu armadura con *Joyas de Bless, Soul y Chaos* (desbloqueando auras esmeralda, zafiro, violeta y oro solar) y sintetiza **Alas Solares (Nv.1)**, **Alas de Arcángel (Nv.2)** y **Alas de Serafín Imperial (Nv.3)**.
   * **Soulshots (`[X]`), Spots de Monstruos, Raid Bosses 3D y Santuario Colectivo estilo *Lineage II*:** Activa sobrecarga de arma (`Daño x1.85`), caza monstruos y Dragones 3D en cada planeta/isla y dona al **Santuario Colectivo** para activar bonos globales de XP y Drop para todo el servidor.

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
2. Crea una rama para tu nueva misión, planeta, barco o habilidad (`git checkout -b feature/nueva-isla`).
3. Envía un **Pull Request (PR)**.
