import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type TemperatureUnit = "C" | "F";

interface TemperatureUnitContextValue {
  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  toggleUnit: () => void;
}

const TemperatureUnitContext = createContext<
  TemperatureUnitContextValue | undefined
>(undefined);

const TEMPERATURE_UNIT_STORAGE_KEY = "betrweather:temperature-unit";

export const TemperatureUnitProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [unit, setUnitState] = useState<TemperatureUnit>("C");

  useEffect(() => {
    const loadUnitPreference = async () => {
      try {
        const storedUnit = await AsyncStorage.getItem(
          TEMPERATURE_UNIT_STORAGE_KEY
        );
        if (storedUnit === "C" || storedUnit === "F") {
          setUnitState(storedUnit);
        }
      } catch (error) {
        console.warn("Failed to load temperature unit preference", error);
      }
    };

    loadUnitPreference();
  }, []);

  const persistUnit = useCallback((nextUnit: TemperatureUnit) => {
    setUnitState(nextUnit);
    AsyncStorage.setItem(TEMPERATURE_UNIT_STORAGE_KEY, nextUnit).catch(
      (error) => console.warn("Failed to persist temperature unit preference", error)
    );
  }, []);

  const value = useMemo(
    () => ({
      unit,
      setUnit: persistUnit,
      toggleUnit: () => persistUnit(unit === "C" ? "F" : "C"),
    }),
    [persistUnit, unit]
  );

  return (
    <TemperatureUnitContext.Provider value={value}>
      {children}
    </TemperatureUnitContext.Provider>
  );
};

export const useTemperatureUnit = () => {
  const context = useContext(TemperatureUnitContext);
  if (!context) {
    throw new Error("useTemperatureUnit must be used within a TemperatureUnitProvider");
  }
  return context;
};
