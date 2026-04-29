import { useState, useEffect, useRef } from "react";

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const WORDS = ["ritual.", "presente.", "pausa.", "memória.", "instante.", "essência."];
const SCRAMBLE_MS = 650;
const HOLD_MS = 2800;
const TICK_MS = 38;

export default function ScrambleWord({ className }) {
    const [text, setText] = useState(WORDS[0]);
    const indexRef = useRef(0);
    const tickRef = useRef(null);

    function scrambleTo(target) {
        const startTime = performance.now();

        function tick() {
            const elapsed = performance.now() - startTime;
            const progress = Math.min(elapsed / SCRAMBLE_MS, 1);
            const resolvedCount = Math.round(progress * target.length);

            const result = target
                .split("")
                .map((char, i) => {
                    if (i < resolvedCount || char === "." || char === " ") return char;
                    return CHARS[Math.floor(Math.random() * CHARS.length)];
                })
                .join("");

            setText(result);

            if (progress < 1) {
                tickRef.current = setTimeout(tick, TICK_MS);
            }
        }

        tick();
    }

    useEffect(() => {
        const cycle = setInterval(() => {
            if (tickRef.current) clearTimeout(tickRef.current);
            indexRef.current = (indexRef.current + 1) % WORDS.length;
            scrambleTo(WORDS[indexRef.current]);
        }, HOLD_MS + SCRAMBLE_MS);

        return () => {
            clearInterval(cycle);
            if (tickRef.current) clearTimeout(tickRef.current);
        };
    }, []);

    return <em className={className}>{text}</em>;
}
