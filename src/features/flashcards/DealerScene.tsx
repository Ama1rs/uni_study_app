import { Text, Environment, ContactShadows, RoundedBox } from '@react-three/drei';

interface DealerSceneProps {
    knewItCount: number;
    forgotItCount: number;
    remainingCount: number;
}

function CardStack({ count, color }: { count: number; color: string }) {
    return (
        <group>
            {Array.from({ length: count }).map((_, i) => (
                <RoundedBox
                    key={i}
                    args={[1, 1.4, 0.01]}
                    radius={0.02}
                    smoothness={2}
                    position={[
                        (Math.random() - 0.5) * 0.05,
                        i * 0.015 + 0.01,
                        (Math.random() - 0.5) * 0.05
                    ]}
                    rotation={[-Math.PI / 2, 0, (Math.random() - 0.5) * 0.1]}
                >
                    <meshStandardMaterial color={color} roughness={0.5} />
                </RoundedBox>
            ))}
        </group>
    );
}

function CardDeckSpread({ count }: { count: number }) {
    return (
        <group position={[0, -0.09, -1.2]} rotation={[0, Math.PI, 0]}>
            {Array.from({ length: Math.min(count, 15) }).map((_, i) => {
                const angle = (i / 14) * Math.PI * 0.6 - Math.PI * 0.3;
                const radius = 1.2;
                return (
                    <RoundedBox
                        key={i}
                        args={[1, 1.4, 0.01]}
                        radius={0.02}
                        smoothness={1}
                        position={[
                            Math.sin(angle) * radius,
                            i * 0.005,
                            Math.cos(angle) * radius * 0.5
                        ]}
                        rotation={[-Math.PI / 2, 0, -angle]}
                    >
                        <meshStandardMaterial color="#1a1a1a" roughness={0.4} />
                    </RoundedBox>
                );
            })}
        </group>
    );
}

export function DealerScene({ knewItCount, forgotItCount, remainingCount }: DealerSceneProps) {
    return (
        <>
            {/* 1. Dramatic Key Light (Top-Front-Right) */}
            <spotLight
                position={[5, 10, 8]}
                angle={0.4}
                penumbra={1}
                intensity={1200}
                castShadow
                shadow-mapSize={[2048, 2048]}
                color="#fffcf0" // Warm white
            />

            {/* 2. Soft Fill Light (Front-Left) */}
            <rectAreaLight
                position={[-5, 5, 5]}
                width={10}
                height={10}
                intensity={5}
                color="#eef2ff" // Cool white
            />

            {/* 3. Rim/Accent Light (Back-Top) - Separates character from background */}
            <pointLight
                position={[0, 8, -5]}
                intensity={800}
                color="#4a90ff"
                distance={20}
            />

            {/* 4. Ambient Base */}
            <ambientLight intensity={0.2} />

            {/* Vibrant Casino Accent Lights - Balanced */}
            <pointLight position={[10, 2, 2]} intensity={500} color="#d946ef" distance={20} />
            <pointLight position={[-10, 2, 2]} intensity={500} color="#3b82f6" distance={20} />

            {/* Table Floor Shadow light */}
            <ContactShadows
                position={[0, -0.5, 0]}
                opacity={0.4}
                scale={20}
                blur={2}
                far={4.5}
            />

            {/* Casino Table */}
            <group position={[0, -0.5, 0]}>
                {/* Main Table Base */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
                    <circleGeometry args={[8.2, 64, 0, Math.PI]} />
                    <meshStandardMaterial color="#050505" metalness={1} roughness={0.1} />
                </mesh>

                {/* Table Felt - Charcoal with texture-like roughness */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                    <circleGeometry args={[8, 64, 0, Math.PI]} />
                    <meshStandardMaterial
                        color="#05100d"
                        roughness={0.9}
                        metalness={0.05}
                    />
                </mesh>

                {/* Table Back Section */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
                    <planeGeometry args={[16, 4]} />
                    <meshStandardMaterial color="#05100d" roughness={0.9} />
                </mesh>

                {/* Card Deck Spread */}
                <CardDeckSpread count={remainingCount} />

                {/* Premium Wood/Metal Trim */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                    <torusGeometry args={[8, 0.04, 16, 64, Math.PI]} />
                    <meshStandardMaterial color="#c0a060" metalness={1} roughness={0.05} />
                </mesh>

                {/* Padded Leather Armrest */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.1]}>
                    <torusGeometry args={[8.15, 0.35, 16, 64, Math.PI]} />
                    <meshStandardMaterial color="#020202" roughness={0.4} metalness={0.1} />
                </mesh>

                {/* Card "Shoes" / Trays - Simplified & Inset */}
                <group position={[-5, 0.01, 1.5]}>
                    {/* Glowing Inset Frame */}
                    <RoundedBox args={[1.2, 1.6, 0.04]} radius={0.02} smoothness={2} castShadow>
                        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
                    </RoundedBox>
                    <mesh position={[0, 0.021, 0]}>
                        <CardStack count={knewItCount} color="#10b981" />
                    </mesh>
                    {/* Small Glowing Indicator Node */}
                    <mesh position={[0, 0, 0.85]}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={2} />
                    </mesh>
                    <pointLight position={[0, 0.2, 0]} intensity={1.5} color="#10b981" distance={2} />
                </group>

                <group position={[5, 0.01, 1.5]}>
                    <RoundedBox args={[1.2, 1.6, 0.04]} radius={0.02} smoothness={2} castShadow>
                        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.2} />
                    </RoundedBox>
                    <mesh position={[0, 0.021, 0]}>
                        <CardStack count={forgotItCount} color="#ef4444" />
                    </mesh>
                    <mesh position={[0, 0, 0.85]}>
                        <sphereGeometry args={[0.03, 16, 16]} />
                        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} />
                    </mesh>
                    <pointLight position={[0, 0.2, 0]} intensity={1.5} color="#ef4444" distance={2} />
                </group>

                {/* Table Labels - Subtle & Integrated */}
                <group position={[-5, 0.02, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
                    <Text
                        fontSize={0.15}
                        color="#10b981"
                        fillOpacity={0.4}
                        letterSpacing={0.1}
                    >
                        KNEW IT
                    </Text>
                </group>

                <group position={[5, 0.02, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
                    <Text
                        fontSize={0.15}
                        color="#ef4444"
                        fillOpacity={0.4}
                        letterSpacing={0.1}
                    >
                        FORGOT IT
                    </Text>
                </group>
            </group>

            <Environment preset="night" background blur={0.8} />
        </>
    );
}

