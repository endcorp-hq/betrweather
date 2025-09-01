declare namespace NodeJS {
    interface ProcessEnv {
        EXPO_PUBLIC_ADMIN_KEY?: string;
        EXPO_PUBLIC_FEE_VAULT?: string;
        EXPO_PUBLIC_USDC_MINT?: string;
        EXPO_PUBLIC_BACKEND_URL?: string;
    }
}