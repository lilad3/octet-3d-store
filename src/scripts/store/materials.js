/* =============================================================
   Matériaux partagés : chaque surface du magasin en réutilise un,
   ce qui permet ensuite de fusionner la géométrie par matériau.
   ============================================================= */
import * as THREE from 'three';
import { terrazzoTexture, oakTexture, carpetTexture, labFloorTexture, perforatedTexture, blobTexture, grilleTexture, ceilingTexture } from './textures.js';

const std = (o) => new THREE.MeshStandardMaterial(o);
const basic = (o) => new THREE.MeshBasicMaterial(o);

export function createMaterials() {
  const M = {
    floor: std({ map: terrazzoTexture(), roughness: 0.4, metalness: 0, envMapIntensity: 0.7 }),
    carpet: std({ map: carpetTexture(), roughness: 1 }),
    labFloor: std({ map: labFloorTexture(), roughness: 0.46, envMapIntensity: 0.6 }),
    // plâtre un ton sous le mur lumineux des caisses, pour que la lumière du fond tire le regard
    plaster: std({ color: 0xE3DDD3, roughness: 0.92 }),
    // la lumière qui rebondit du sol éclaire le plafond : on la simule par une légère émission
    ceiling: std({ map: ceilingTexture(), roughness: 1, emissive: 0xE2DCD1, emissiveIntensity: 0.3 }),
    oak: std({ map: oakTexture(), roughness: 0.55 }),
    alu: std({ color: 0xC5C9CD, metalness: 0.85, roughness: 0.32 }),
    aluDark: std({ color: 0x8C9196, metalness: 0.8, roughness: 0.42 }),
    graphite: std({ color: 0x2A2B2E, roughness: 0.62, metalness: 0.08 }),
    black: std({ color: 0x151618, roughness: 0.42, metalness: 0.2 }),
    blackMatte: std({ color: 0x1B1C1E, roughness: 0.82 }),
    stone: std({ color: 0xECEAE5, roughness: 0.36 }),
    brass: std({ color: 0xBE9550, metalness: 1, roughness: 0.3 }),
    silver: std({ color: 0xC3C7CB, metalness: 0.82, roughness: 0.28 }),
    whitePlastic: std({ color: 0xEDEDEA, roughness: 0.42 }),
    greyPlastic: std({ color: 0xD4D4D0, roughness: 0.5 }),
    pcb: std({ color: 0x1D2622, roughness: 0.6 }),
    gold: std({ color: 0xD4AF5A, metalness: 1, roughness: 0.35 }),
    rubber: std({ color: 0x232427, roughness: 0.9 }),
    fabric: std({ color: 0x35373B, roughness: 0.96 }),
    felt: std({ color: 0x8E8C88, roughness: 1 }),
    cable: std({ color: 0x5B7A9A, roughness: 0.55 }),
    spoolWood: std({ color: 0xB89468, roughness: 0.8 }),
    perforated: std({ map: perforatedTexture(), roughness: 0.55, metalness: 0.5 }),
    pegboard: std({ map: perforatedTexture('#E9E6E0', '#8C877F'), roughness: 0.8 }),
    grille: std({ map: grilleTexture(), roughness: 0.7, metalness: 0.3 }),
    glass: std({ color: 0xE6F0F1, transparent: true, opacity: 0.13, roughness: 0.04, metalness: 0, envMapIntensity: 1.6, depthWrite: false }),
    acrylic: std({ color: 0xF4F7F8, transparent: true, opacity: 0.32, roughness: 0.08, envMapIntensity: 1.2, depthWrite: false }),

    /* sources de lumière : non éclairées, elles brillent d'elles-mêmes */
    lamp: basic({ color: 0xFFFBF3, toneMapped: false }),
    lightwall: basic({ color: 0xFFFFFF, toneMapped: false }),
    ledWhite: basic({ color: 0xFFF6E8 }),
    ledWarm: basic({ color: 0xFFD9A8 }),
    ledGreen: basic({ color: 0x5CD694 }),
    ledCyan: basic({ color: 0x53D2E0 }),
    ledAmber: basic({ color: 0xF6A623 }),

    blob: basic({ map: blobTexture(), transparent: true, depthWrite: false, opacity: 0.8 })
  };
  return M;
}
