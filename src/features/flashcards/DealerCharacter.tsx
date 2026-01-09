import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

interface DealerCharacterProps {
    animationState: 'idle' | 'shuffle' | 'deal' | 'retrieve' | 'slideAside' | 'discard' | 'presenting';
}

type IdleAction = 'neutral' | 'lookCard' | 'lookPlayer' | 'tilt' | 'settle';

export function DealerCharacter({ animationState }: DealerCharacterProps) {
    const groupRef = useRef<THREE.Group>(null);
    const torsoRef = useRef<THREE.Group>(null);
    const neckGroupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Group>(null);
    const visorRef = useRef<THREE.Mesh>(null);

    const leftShoulderRollRef = useRef<THREE.Group>(null);
    const rightShoulderRollRef = useRef<THREE.Group>(null);
    const leftArmRef = useRef<THREE.Group>(null);
    const rightArmRef = useRef<THREE.Group>(null);
    const leftForearmRef = useRef<THREE.Group>(null);
    const rightForearmRef = useRef<THREE.Group>(null);

    // Personality Loop State
    const [idleAction, setIdleAction] = useState<IdleAction>('neutral');
    const actionTimerRef = useRef(0);
    const targetNeckRot = useRef(new THREE.Euler());

    const stateTimerRef = useRef(0);
    const prevStateRef = useRef<string>('idle');

    // Dynamics helper
    const lerpEuler = (current: THREE.Euler, target: THREE.Euler, speed: number) => {
        current.x = THREE.MathUtils.lerp(current.x, target.x, speed);
        current.y = THREE.MathUtils.lerp(current.y, target.y, speed);
        current.z = THREE.MathUtils.lerp(current.z, target.z, speed);
    };

    useFrame((state, delta) => {
        if (!groupRef.current) return;
        const time = state.clock.getElapsedTime();

        if (animationState !== prevStateRef.current) {
            stateTimerRef.current = 0;
            prevStateRef.current = animationState;
        }
        stateTimerRef.current += delta;
        const phase = stateTimerRef.current;

        // 1. Personality Loop (Idle micro-decisions)
        if (animationState === 'idle') {
            actionTimerRef.current -= delta;
            if (actionTimerRef.current <= 0) {
                const actions: IdleAction[] = ['neutral', 'lookCard', 'lookPlayer', 'tilt', 'settle'];
                const next = actions[Math.floor(Math.random() * actions.length)];
                setIdleAction(next);
                actionTimerRef.current = 2 + Math.random() * 4;
            }

            switch (idleAction) {
                case 'lookCard':
                    targetNeckRot.current.set(0.4, 0.2, 0);
                    break;
                case 'lookPlayer':
                    targetNeckRot.current.set(-0.1, -0.3, 0.1);
                    break;
                case 'tilt':
                    targetNeckRot.current.set(0, 0, 0.15);
                    break;
                default:
                    targetNeckRot.current.set(0, 0, 0);
            }

            groupRef.current.position.y = Math.sin(time * 0.5) * 0.02;
            if (torsoRef.current) torsoRef.current.rotation.z = Math.sin(time * 0.3) * 0.01;
        } else if (animationState === 'deal' || animationState === 'presenting') {
            targetNeckRot.current.set(0.35, 0.15, 0); // Focus on the presented area
        } else {
            targetNeckRot.current.set(0, 0, 0);
        }

        if (neckGroupRef.current) {
            lerpEuler(neckGroupRef.current.rotation, targetNeckRot.current, 0.05);
        }

        // 2. Visor Emotions
        if (visorRef.current) {
            const mat = visorRef.current.material as THREE.MeshBasicMaterial;
            let targetOpacity = 0.6;
            let pulseSpeed = 1;

            switch (animationState) {
                case 'deal':
                    targetOpacity = 0.95;
                    pulseSpeed = 10;
                    break;
                case 'discard':
                case 'retrieve':
                    targetOpacity = 0.2;
                    pulseSpeed = 1;
                    break;
                case 'idle':
                    targetOpacity = 0.6;
                    pulseSpeed = 2;
                    break;
            }
            const currentPulse = 0.7 + Math.sin(time * pulseSpeed) * 0.3;
            mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity * currentPulse, 0.1);
        }

        // 3. Intent-based Arm Animations
        if (leftArmRef.current && rightArmRef.current && leftShoulderRollRef.current && rightShoulderRollRef.current) {
            const lSR = leftShoulderRollRef.current;
            const rSR = rightShoulderRollRef.current;
            const lA = leftArmRef.current;
            const rA = rightArmRef.current;
            const lF = leftForearmRef.current!;
            const rF = rightForearmRef.current!;

            switch (animationState) {
                case 'deal': {
                    if (phase < 0.4) {
                        const t = phase / 0.4;
                        rSR.rotation.x = THREE.MathUtils.lerp(0, 0.3, t);
                        rA.rotation.x = THREE.MathUtils.lerp(0.2, 0.5, t);
                        rF.rotation.x = THREE.MathUtils.lerp(-0.3, -0.6, t);
                    } else if (phase < 0.8) {
                        const t = (phase - 0.4) / 0.4;
                        rSR.rotation.x = THREE.MathUtils.lerp(0.3, -0.6, t);
                        rA.rotation.x = THREE.MathUtils.lerp(0.5, -1.6, t);
                        rF.rotation.x = THREE.MathUtils.lerp(-0.6, 0.6, t);
                    } else {
                        const t = Math.min(1, (phase - 0.8) / 0.5);
                        rSR.rotation.x = THREE.MathUtils.lerp(-0.6, 0, t);
                        rA.rotation.x = THREE.MathUtils.lerp(-1.6, 0.2, t);
                        rF.rotation.x = THREE.MathUtils.lerp(0.6, -0.3, t);
                    }
                    break;
                }
                case 'shuffle':
                    lA.rotation.x = -0.7 + Math.sin(time * 8) * 0.4;
                    rA.rotation.x = -0.7 + Math.cos(time * 8) * 0.4;
                    lSR.rotation.x = Math.sin(time * 8) * 0.1;
                    rSR.rotation.x = Math.cos(time * 8) * 0.1;
                    break;
                case 'slideAside':
                    lSR.rotation.y = THREE.MathUtils.lerp(lSR.rotation.y, 0.6, 0.1);
                    lA.rotation.x = THREE.MathUtils.lerp(lA.rotation.x, -0.8, 0.1);
                    break;
                case 'discard':
                    rSR.rotation.y = THREE.MathUtils.lerp(rSR.rotation.y, -0.6, 0.1);
                    rA.rotation.x = THREE.MathUtils.lerp(rA.rotation.x, -0.8, 0.1);
                    break;
                case 'presenting':
                    // Right arm curves toward the card
                    rSR.rotation.y = THREE.MathUtils.lerp(rSR.rotation.y, -0.2, 0.1);
                    rSR.rotation.x = THREE.MathUtils.lerp(rSR.rotation.x, -0.3, 0.1);
                    rA.rotation.x = THREE.MathUtils.lerp(rA.rotation.x, -0.4, 0.1);
                    rF.rotation.x = THREE.MathUtils.lerp(rF.rotation.x, -0.2, 0.1);
                    rF.rotation.y = THREE.MathUtils.lerp(rF.rotation.y, -0.4, 0.1);

                    // Left arm stays neutral
                    lSR.rotation.x = THREE.MathUtils.lerp(lSR.rotation.x, 0, 0.05);
                    lA.rotation.x = THREE.MathUtils.lerp(lA.rotation.x, 0.2, 0.05);
                    break;
                default:
                    lSR.rotation.x = THREE.MathUtils.lerp(lSR.rotation.x, 0, 0.05);
                    rSR.rotation.x = THREE.MathUtils.lerp(rSR.rotation.x, 0, 0.05);
                    lSR.rotation.y = THREE.MathUtils.lerp(lSR.rotation.y, 0, 0.05);
                    rSR.rotation.y = THREE.MathUtils.lerp(rSR.rotation.y, 0, 0.05);

                    lA.rotation.x = THREE.MathUtils.lerp(lA.rotation.x, 0.2 + Math.sin(time * 0.5) * 0.05, 0.05);
                    rA.rotation.x = THREE.MathUtils.lerp(rA.rotation.x, 0.2 + Math.cos(time * 0.5) * 0.05, 0.05);

                    lF.rotation.x = THREE.MathUtils.lerp(lF.rotation.x, -0.3, 0.05);
                    rF.rotation.x = THREE.MathUtils.lerp(rF.rotation.x, -0.3, 0.05);
            }
        }
    });

    return (
        <group ref={groupRef} position={[0, 0, -2]}>
            <group ref={neckGroupRef} position={[0, 1.4, 0]}>
                <mesh position={[0, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.13, 0.15, 0.15, 24]} />
                    <meshStandardMaterial color="#f8fafc" roughness={0.6} metalness={0} />
                </mesh>

                <group ref={headRef} position={[0, 0.3, 0]} scale={[1, 1.05, 1]}>
                    <mesh castShadow>
                        <sphereGeometry args={[0.26, 32, 32]} />
                        <meshPhysicalMaterial
                            transmission={0.95}
                            thickness={0.5}
                            roughness={0.05}
                            metalness={0.02}
                            ior={1.45}
                            clearcoat={1}
                            clearcoatRoughness={0.05}
                            transparent
                            opacity={0.4}
                        />
                    </mesh>

                    <mesh scale={[0.4, 0.4, 0.4]} position={[0, 0, 0]}>
                        <sphereGeometry args={[0.2, 16, 16]} />
                        <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} transparent opacity={0.6} />
                    </mesh>

                    <mesh ref={visorRef} position={[0, 0, 0.18]}>
                        <boxGeometry args={[0.2, 0.015, 0.02]} />
                        <meshBasicMaterial color="#4a90ff" transparent opacity={0.8} />
                    </mesh>
                </group>
            </group>

            <group ref={torsoRef}>
                <RoundedBox args={[0.85, 1.25, 0.45]} radius={0.08} smoothness={4} position={[0, 0.7, 0]} castShadow>
                    <meshStandardMaterial color="#080808" roughness={0.45} metalness={0.05} />
                </RoundedBox>

                <RoundedBox args={[0.3, 1.0, 0.02]} radius={0.02} smoothness={2} position={[0, 0.8, 0.22]} castShadow>
                    <meshStandardMaterial color="#f1f5f9" roughness={0.6} metalness={0} />
                </RoundedBox>

                <group position={[0, 0.95, 0.24]}>
                    <RoundedBox args={[0.2, 0.7, 0.04]} radius={0.01} smoothness={2} position={[-0.22, 0, 0]} rotation={[0.05, 0, -0.15]} castShadow>
                        <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.6} />
                    </RoundedBox>
                    <RoundedBox args={[0.2, 0.7, 0.04]} radius={0.01} smoothness={2} position={[0.22, 0, 0]} rotation={[0.05, 0, 0.15]} castShadow>
                        <meshStandardMaterial color="#050505" roughness={0.2} metalness={0.6} />
                    </RoundedBox>
                </group>

                <group position={[0, 1.34, 0.25]}>
                    <RoundedBox args={[0.06, 0.08, 0.04]} radius={0.01} smoothness={2}>
                        <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.1} />
                    </RoundedBox>
                    <RoundedBox args={[0.14, 0.07, 0.03]} radius={0.01} smoothness={2} position={[-0.09, 0, 0]} rotation={[0, 0, 0.1]}>
                        <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.1} />
                    </RoundedBox>
                    <RoundedBox args={[0.14, 0.07, 0.03]} radius={0.01} smoothness={2} position={[0.09, 0, 0]} rotation={[0, 0, -0.1]}>
                        <meshStandardMaterial color="#020617" roughness={0.3} metalness={0.1} />
                    </RoundedBox>
                </group>

                {[1.0, 0.75, 0.5].map((y, i) => (
                    <mesh key={i} position={[0, y, 0.24]} castShadow>
                        <sphereGeometry args={[0.018, 16, 16]} />
                        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
                    </mesh>
                ))}
            </group>

            <group ref={leftShoulderRollRef} position={[-0.52, 1.25, 0]}>
                <group ref={leftArmRef}>
                    <mesh castShadow><sphereGeometry args={[0.11, 24]} /><meshStandardMaterial color="#080808" roughness={0.45} /></mesh>
                    <mesh position={[0, -0.32, 0]} castShadow>
                        <cylinderGeometry args={[0.08, 0.06, 0.65, 16]} />
                        <meshStandardMaterial color="#080808" roughness={0.45} />
                    </mesh>
                    <group ref={leftForearmRef} position={[0, -0.65, 0]}>
                        <mesh position={[0, -0.3, 0]} castShadow>
                            <cylinderGeometry args={[0.065, 0.055, 0.6, 16]} />
                            <meshStandardMaterial color="#080808" roughness={0.45} />
                        </mesh>
                        {/* Articulated Hand - Left */}
                        <group position={[0, -0.6, 0]}>
                            {/* Palm */}
                            <RoundedBox args={[0.1, 0.12, 0.06]} radius={0.02} smoothness={2} castShadow>
                                <meshStandardMaterial color="#111111" roughness={0.5} />
                            </RoundedBox>
                            {/* Thumb */}
                            <group position={[-0.04, 0, 0]} rotation={[0, 0, 0.4]}>
                                <RoundedBox args={[0.03, 0.06, 0.03]} radius={0.01} smoothness={1} position={[0, -0.03, 0]}>
                                    <meshStandardMaterial color="#111111" roughness={0.5} />
                                </RoundedBox>
                            </group>
                            {/* Fingers Group */}
                            <group position={[0, -0.06, 0]}>
                                <RoundedBox args={[0.08, 0.1, 0.05]} radius={0.015} smoothness={2} position={[0, -0.05, 0]}>
                                    <meshStandardMaterial color="#111111" roughness={0.5} />
                                </RoundedBox>
                            </group>
                        </group>
                    </group>
                </group>
            </group>

            <group ref={rightShoulderRollRef} position={[0.52, 1.25, 0]}>
                <group ref={rightArmRef}>
                    <mesh castShadow><sphereGeometry args={[0.11, 24]} /><meshStandardMaterial color="#080808" roughness={0.45} /></mesh>
                    <mesh position={[0, -0.32, 0]} castShadow>
                        <cylinderGeometry args={[0.08, 0.06, 0.65, 16]} />
                        <meshStandardMaterial color="#080808" roughness={0.45} />
                    </mesh>
                    <group ref={rightForearmRef} position={[0, -0.65, 0]}>
                        <mesh position={[0, -0.3, 0]} castShadow>
                            <cylinderGeometry args={[0.065, 0.055, 0.6, 16]} />
                            <meshStandardMaterial color="#080808" roughness={0.45} />
                        </mesh>
                        {/* Articulated Hand - Right */}
                        <group position={[0, -0.6, 0]}>
                            {/* Palm */}
                            <RoundedBox args={[0.1, 0.12, 0.06]} radius={0.02} smoothness={2} castShadow>
                                <meshStandardMaterial color="#111111" roughness={0.5} />
                            </RoundedBox>
                            {/* Thumb */}
                            <group position={[0.04, 0, 0]} rotation={[0, 0, -0.4]}>
                                <RoundedBox args={[0.03, 0.06, 0.03]} radius={0.01} smoothness={1} position={[0, -0.03, 0]}>
                                    <meshStandardMaterial color="#111111" roughness={0.5} />
                                </RoundedBox>
                            </group>
                            {/* Fingers Group */}
                            <group position={[0, -0.06, 0]}>
                                <RoundedBox args={[0.08, 0.1, 0.05]} radius={0.015} smoothness={2} position={[0, -0.05, 0]}>
                                    <meshStandardMaterial color="#111111" roughness={0.5} />
                                </RoundedBox>
                            </group>
                        </group>
                    </group>
                </group>
            </group>
        </group>
    );
}
