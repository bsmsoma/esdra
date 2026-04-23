import React, { useState, useEffect } from "react";
import { Range, getTrackBackground } from "react-range";
import styles from "./PriceRangeFilter.module.scss";

const STEP = 1;

function toNumericPair(value, fallbackMin, fallbackMax) {
    if (Array.isArray(value) && value.length === 2) {
        return [Number(value[0]), Number(value[1])];
    }
    return [fallbackMin, fallbackMax];
}

function PriceRange({ min, max, value, onChange }) {
    const [values, setValues] = useState(function() {
        return toNumericPair(value, min, max);
    });

    useEffect(function() {
        const nextValues = toNumericPair(value, min, max);
        setValues(function(prev) {
            const [prevMin, prevMax] = prev;
            const [nextMin, nextMax] = nextValues;
            if (prevMin === nextMin && prevMax === nextMax) {
                return prev;
            }
            return nextValues;
        });
    }, [value, min, max]);

    function handleChange(newValues) {
        setValues(newValues);
        if (onChange) {
            onChange(newValues);
        }
    }

    return (
        <div className={styles.priceRangeFilter}>
            <Range
                values={values}
                step={STEP}
                min={min}
                max={max}
                onChange={handleChange}
                renderTrack={function({ props, children }) {
                    const { key, ...trackProps } = props;
                    return (
                        <div
                            key={key}
                            {...trackProps}
                            style={{
                                ...trackProps.style,
                                height: "6px",
                                width: "100%",
                                background: getTrackBackground({
                                    values,
                                    colors: ["#ccc", "#548BF4", "#ccc"],
                                    min,
                                    max,
                                }),
                                borderRadius: "4px",
                            }}
                            className={styles.track}
                        >
                            {children}
                        </div>
                    );
                }}
                renderThumb={function({ props }) {
                    const { key, ...thumbProps } = props;
                    return <div key={key} {...thumbProps} className={styles.thumb} />;
                }}
            />
            <div className={styles.labels}>
                <span>R$ {values[0]}</span>
                <span>R$ {values[1]}</span>
            </div>
        </div>
    );
}

export default PriceRange;
