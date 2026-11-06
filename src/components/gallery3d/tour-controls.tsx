'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import { Vector3 } from 'three';
import { VISITOR_EYE, type Room } from '@/lib/gallery/layout';
import { isTourKey, tourInput } from '@/lib/gallery/tour-input';

/** Movimiento pedido desde los botones en pantalla (tactil): -1, 0 o 1. */
export interface MoveIntent {
  forward: number;
  turn: number;
}

export interface Obstacle {
  x: number;
  z: number;
  radius: number;
}

export interface Viewpoint {
  position: [number, number, number];
  target: [number, number, number];
}

const WALK_SPEED = 1.5;
const RUN_SPEED = 3;
const TURN_SPEED = 1.6;
const TILT_SPEED = 1.1;
const LOOK_SENSITIVITY = 0.0032;
const MAX_PITCH = 0.75;
const BODY_RADIUS = 0.35;
const WALL_MARGIN = 0.45;
const FOCUS_SECONDS = 0.9;

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/** Orientacion (yaw, pitch) para mirar de `from` a `to`. */
function lookAngles(from: Vector3, to: Vector3): { yaw: number; pitch: number } {
  const direction = to.clone().sub(from);
  return {
    yaw: Math.atan2(-direction.x, -direction.z),
    pitch: Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
  };
}

function shortestAngle(from: number, to: number): number {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return from + delta;
}

/**
 * Recorrido a pie: la camara va a la altura de los ojos, arrastrar mira
 * alrededor, WASD camina (Shift corre) y las flechas mueven la camara hacia los
 * cuatro lados; Q/E tambien giran. No atraviesa paredes ni pedestales. Con
 * `focus`, la camara viaja hasta el punto de vista de la obra; moverse de nuevo
 * deja ese modo.
 */
export function TourControls({
  room,
  obstacles,
  focus,
  onLeaveFocus,
  intent,
  reducedMotion,
}: {
  room: Room;
  obstacles: readonly Obstacle[];
  focus: Viewpoint | null;
  onLeaveFocus: () => void;
  intent: RefObject<MoveIntent>;
  reducedMotion: boolean;
}) {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(-0.04);
  const keys = useRef(new Set<string>());
  const flight = useRef<{ from: Vector3; to: Vector3; fromYaw: number; toYaw: number; fromPitch: number; toPitch: number; elapsed: number } | null>(null);
  const focused = useRef(false);

  // Posicion inicial: junto a la entrada, mirando hacia el fondo.
  useEffect(() => {
    camera.position.set(0, VISITOR_EYE, room.depth / 2 - 1.3);
    yaw.current = 0;
    pitch.current = -0.04;
  }, [camera, room.depth]);

  useEffect(() => {
    const element = gl.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    const down = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
    };
    const move = (event: PointerEvent) => {
      if (!dragging) {
        return;
      }
      yaw.current += (event.clientX - lastX) * LOOK_SENSITIVITY;
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current + (event.clientY - lastY) * LOOK_SENSITIVITY));
      lastX = event.clientX;
      lastY = event.clientY;
      flight.current = null;
    };
    const up = () => {
      dragging = false;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (isTyping(event.target)) {
        return;
      }
      if (isTourKey(event.code)) {
        event.preventDefault();
        keys.current.add(event.code);
      }
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.add('Shift');
      }
    };
    const keyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
        keys.current.delete('Shift');
      }
    };
    const blur = () => {
      keys.current.clear();
    };
    element.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      element.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
    };
  }, [gl]);

  // Al elegir una obra, la camara viaja a su punto de vista.
  useEffect(() => {
    if (!focus) {
      focused.current = false;
      return;
    }
    const to = new Vector3(...focus.position);
    const angles = lookAngles(to, new Vector3(...focus.target));
    focused.current = true;
    if (reducedMotion) {
      camera.position.copy(to);
      yaw.current = angles.yaw;
      pitch.current = angles.pitch;
      flight.current = null;
      return;
    }
    flight.current = {
      from: camera.position.clone(),
      to,
      fromYaw: yaw.current,
      toYaw: shortestAngle(yaw.current, angles.yaw),
      fromPitch: pitch.current,
      toPitch: angles.pitch,
      elapsed: 0,
    };
  }, [focus, camera, reducedMotion]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1);
    const input = tourInput(keys.current);
    const forward = input.forward + intent.current.forward;
    const { strafe, tilt } = input;
    const turn = input.turn + intent.current.turn;

    if (forward !== 0 || strafe !== 0 || turn !== 0 || tilt !== 0) {
      flight.current = null;
      if (focused.current) {
        focused.current = false;
        onLeaveFocus();
      }
    }

    const travel = flight.current;
    if (travel) {
      travel.elapsed += step;
      const t = easeInOut(Math.min(1, travel.elapsed / FOCUS_SECONDS));
      camera.position.lerpVectors(travel.from, travel.to, t);
      yaw.current = travel.fromYaw + (travel.toYaw - travel.fromYaw) * t;
      pitch.current = travel.fromPitch + (travel.toPitch - travel.fromPitch) * t;
      if (t >= 1) {
        flight.current = null;
      }
    } else {
      yaw.current += turn * TURN_SPEED * step;
      pitch.current = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.current + tilt * TILT_SPEED * step));
      const speed = (keys.current.has('Shift') ? RUN_SPEED : WALK_SPEED) * step;
      const sin = Math.sin(yaw.current);
      const cos = Math.cos(yaw.current);
      let x = camera.position.x + (-sin * forward + cos * strafe) * speed;
      let z = camera.position.z + (-cos * forward - sin * strafe) * speed;
      ({ x, z } = collide(x, z, room, obstacles));
      camera.position.set(x, VISITOR_EYE, z);
    }
    camera.rotation.set(pitch.current, yaw.current, 0, 'YXZ');
  });

  return null;
}

/** Mantiene al visitante dentro de la sala y fuera de los pedestales. */
export function collide(x: number, z: number, room: Room, obstacles: readonly Obstacle[]): { x: number; z: number } {
  const limitX = room.width / 2 - WALL_MARGIN;
  const limitZ = room.depth / 2 - WALL_MARGIN;
  let nextX = Math.min(limitX, Math.max(-limitX, x));
  let nextZ = Math.min(limitZ, Math.max(-limitZ, z));
  for (const obstacle of obstacles) {
    const dx = nextX - obstacle.x;
    const dz = nextZ - obstacle.z;
    const distance = Math.hypot(dx, dz);
    const minimum = obstacle.radius + BODY_RADIUS;
    if (distance < minimum) {
      const factor = distance > 1e-6 ? minimum / distance : 1;
      nextX = obstacle.x + (distance > 1e-6 ? dx : minimum) * factor;
      nextZ = obstacle.z + dz * factor;
    }
  }
  return { x: nextX, z: nextZ };
}
