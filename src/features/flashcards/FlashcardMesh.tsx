import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Flashcard } from '../../types/node-system';

interface FlashcardMeshProps {
    card: Flashcard;
    isFlipped: boolean;
    animationState: 'dealing' | 'showing' | 'flipping' | 'slidingLeft' | 'slidingRight' | 'discarding';
    onAnimationComplete?: () => void;
    knewItCount: number;
    forgotItCount: number;
}

export function FlashcardMesh({ card, isFlipped, animationState, onAnimationComplete, knewItCount, forgotItCount }: FlashcardMeshProps) {
    const cardRef = useRef<THREE.Group>(null);
    const stateTimerRef = useRef(0);
    const prevStateRef = useRef<string>('');

    useFrame((state, delta) => {
        if (!cardRef.current) return;

        if (animationState !== prevStateRef.current) {
            stateTimerRef.current = 0;
            prevStateRef.current = animationState;
        }
        stateTimerRef.current += delta;
        const phase = stateTimerRef.current;

        switch (animationState) {
            case 'dealing':
                // Align with Dealer's 1.5s deal cycle
                if (phase < 0.6) {
                    // Stay tucked in dealer's hand/area during pull-back
                    cardRef.current.position.set(0.8, 1.0, -2.5);
                    cardRef.current.scale.setScalar(0.4);
                    cardRef.current.rotation.set(0, 0, 0.2);
                } else if (phase < 1.1) {
                    // Snap forward (The Throw)
                    const t = (phase - 0.6) / 0.5;
                    const ease = 1 - Math.pow(1 - t, 4); // Strong ease-out
                    cardRef.current.position.x = THREE.MathUtils.lerp(0.8, 0, ease);
                    cardRef.current.position.z = THREE.MathUtils.lerp(-2.5, 1.4, ease);
                    cardRef.current.position.y = THREE.MathUtils.lerp(1.0, 0.9, ease) + Math.sin(t * Math.PI) * 0.5;
                    cardRef.current.scale.setScalar(THREE.MathUtils.lerp(0.4, 0.85, ease));
                    cardRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.2, ease);
                    cardRef.current.rotation.z = THREE.MathUtils.lerp(0.2, 0, ease);
                } else {
                    // Settle
                    if (phase >= 1.4 && onAnimationComplete) onAnimationComplete();
                    cardRef.current.position.set(0, 0.9, 1.4);
                    cardRef.current.rotation.set(-0.2, isFlipped ? Math.PI : 0, 0);
                    cardRef.current.scale.setScalar(0.85);
                }
                break;

            case 'flipping': {
                const speed = 4.0;
                const t = Math.min(1, phase * speed);
                const flipRotation = t * Math.PI;
                cardRef.current.rotation.y = isFlipped ? flipRotation : Math.PI - flipRotation;
                cardRef.current.position.y = 0.9 + Math.sin(t * Math.PI) * 0.2;
                if (t >= 1 && onAnimationComplete) onAnimationComplete();
                break;
            }

            case 'slidingLeft': {
                const speed = 1.0;
                const t = Math.min(1, phase * speed);
                const ease = 1 - Math.pow(1 - t, 3);
                // World space calculation: Table is at -0.5. Tray group is at +0.01 rel to table.
                // Stack Y starts at -0.5 + 0.01 + 0.021 = -0.469
                const targetY = knewItCount * 0.015 - 0.469;

                cardRef.current.position.set(
                    THREE.MathUtils.lerp(0, -5, ease),
                    THREE.MathUtils.lerp(0.9, targetY, ease),
                    THREE.MathUtils.lerp(1.4, 1.5, ease)
                );
                cardRef.current.rotation.set(
                    THREE.MathUtils.lerp(-0.2, -Math.PI / 2, ease),
                    THREE.MathUtils.lerp(0, 0, ease),
                    THREE.MathUtils.lerp(0, 0.05, ease)
                );
                cardRef.current.scale.setScalar(THREE.MathUtils.lerp(0.85, 0.45, ease)); // Scale down to fit Tray
                if (t >= 1 && onAnimationComplete) onAnimationComplete();
                break;
            }

            case 'slidingRight': {
                const speed = 1.0;
                const t = Math.min(1, phase * speed);
                const ease = 1 - Math.pow(1 - t, 3);
                const targetY = forgotItCount * 0.015 - 0.469;

                cardRef.current.position.set(
                    THREE.MathUtils.lerp(0, 5, ease),
                    THREE.MathUtils.lerp(0.9, targetY, ease),
                    THREE.MathUtils.lerp(1.4, 1.5, ease)
                );
                cardRef.current.rotation.set(
                    THREE.MathUtils.lerp(-0.2, -Math.PI / 2, ease),
                    THREE.MathUtils.lerp(0, 0, ease),
                    THREE.MathUtils.lerp(0, -0.05, ease)
                );
                cardRef.current.scale.setScalar(THREE.MathUtils.lerp(0.85, 0.45, ease));
                if (t >= 1 && onAnimationComplete) onAnimationComplete();
                break;
            }

            case 'showing': {
                const time = state.clock.getElapsedTime();
                const hover = Math.sin(time * 1.5) * 0.04;
                const breath = 1 + Math.sin(time * 0.8) * 0.01;

                // Initial bloom (first 0.5s of showing)
                let bloomRot = 0;
                let bloomZ = 0;
                if (phase < 0.5) {
                    const t = phase / 0.5;
                    const ease = Math.sin(t * Math.PI * 0.5);
                    bloomRot = THREE.MathUtils.lerp(0.2, 0, ease);
                    bloomZ = THREE.MathUtils.lerp(-0.2, 0, ease);
                }

                cardRef.current.position.x = THREE.MathUtils.lerp(cardRef.current.position.x, 0, 0.1);
                cardRef.current.position.y = THREE.MathUtils.lerp(cardRef.current.position.y, 0.9 + hover, 0.1);
                cardRef.current.position.z = THREE.MathUtils.lerp(cardRef.current.position.z, 1.4 + bloomZ, 0.1);

                cardRef.current.rotation.x = THREE.MathUtils.lerp(cardRef.current.rotation.x, -0.2 + bloomRot, 0.1);
                cardRef.current.rotation.z = THREE.MathUtils.lerp(cardRef.current.rotation.z, 0, 0.1);
                cardRef.current.rotation.y = THREE.MathUtils.lerp(cardRef.current.rotation.y, isFlipped ? Math.PI : 0, 0.15);
                cardRef.current.scale.setScalar(THREE.MathUtils.lerp(cardRef.current.scale.x, 0.85 * breath, 0.1));
                break;
            }
        }
    });

    useEffect(() => {
        if (animationState === 'dealing') {
            stateTimerRef.current = 0;
            if (cardRef.current) {
                cardRef.current.position.set(0.8, 1.0, -1.5);
                cardRef.current.scale.setScalar(0.4);
            }
        }
    }, [animationState, card.id]);

    const truncateText = (text: string, maxLength: number = 180) => {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    };

    return (
        <group ref={cardRef}>
            {/* 1. MAIN CARD VOLUME - Thickness is 0.08 (±0.04) */}
            <RoundedBox args={[2.3, 3.3, 0.08]} radius={0.12} smoothness={1}>
                <meshStandardMaterial color="#ffffff" roughness={0.3} metalness={0.05} />
            </RoundedBox>

            {/* 2. FRONT FACE CONTENT - Placed at +0.041 to be visible on card front */}
            <group position={[0, 0, 0.041]}>
                {/* Visual Border */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[2.1, 3.1]} />
                    <meshBasicMaterial color="#000000" />
                </mesh>

                {/* White Paper Area */}
                <mesh position={[0, 0, 0.001]}>
                    <planeGeometry args={[2.05, 3.05]} />
                    <meshBasicMaterial color="#f8fafc" />
                </mesh>

                {/* Question Elements */}
                <group position={[0, 0, 0.002]}>
                    {[[-1, 1], [1, -1]].map((pos, i) => (
                        <group key={i} position={[pos[0] * 0.85, pos[1] * 1.35, 0]}>
                            <Text
                                fontSize={0.12}
                                color="#d946ef"
                                fontWeight="bold"
                                anchorX="center"
                                anchorY="middle"
                                rotation={[0, 0, pos[1] < 0 ? Math.PI : 0]}
                            >
                                STUDY
                            </Text>
                            <Text
                                position={[0, pos[1] > 0 ? -0.15 : 0.15, 0]}
                                fontSize={0.2}
                                color="#0f172a"
                                fontWeight="900"
                            >
                                ★
                            </Text>
                        </group>
                    ))}

                    <Text
                        position={[0, 1.2, 0]}
                        fontSize={0.06}
                        color="#64748b"
                        letterSpacing={0.2}
                        fontWeight="bold"
                    >
                        ACADEMIA DECK
                    </Text>

                    <Text
                        position={[0, 0, 0]}
                        fontSize={0.18}
                        color="#0f172a"
                        maxWidth={1.7}
                        textAlign="center"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        lineHeight={1.4}
                    >
                        {truncateText(card.front)}
                    </Text>
                </group>
            </group>

            {/* 3. BACK FACE CONTENT - Placed at -0.041 to be visible on card back */}
            <group position={[0, 0, -0.041]} rotation={[0, Math.PI, 0]}>
                {/* Back Design Base (Blue) */}
                <mesh position={[0, 0, 0]}>
                    <planeGeometry args={[2.2, 3.2]} />
                    <meshBasicMaterial color="#2563eb" />
                </mesh>

                {/* Decorative Pattern Layer */}
                <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 0, 0.001]}>
                    <planeGeometry args={[1.5, 1.5]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.1} />
                </mesh>

                <group position={[0, 0, 0.01]}>
                    <Text fontSize={0.8} color="#ffffff" fillOpacity={0.1} fontWeight="900">
                        A
                    </Text>
                    <Text position={[0, -0.5, 0]} fontSize={0.08} color="#ffffff" letterSpacing={0.4} fontWeight="bold">
                        LEARNING
                    </Text>
                </group>

                {/* Visible Answer Content */}
                <group position={[0, 0, 0.02]} visible={isFlipped}>
                    <mesh position={[0, 0, -0.005]}>
                        <planeGeometry args={[2.1, 3.1]} />
                        <meshBasicMaterial color="#ffffff" />
                    </mesh>
                    <Text
                        fontSize={0.16}
                        color="#000000"
                        maxWidth={1.8}
                        textAlign="center"
                        anchorX="center"
                        anchorY="middle"
                        fontWeight="bold"
                        lineHeight={1.4}
                    >
                        {truncateText(card.back, 250)}
                    </Text>
                </group>
            </group>
        </group>
    );
}
