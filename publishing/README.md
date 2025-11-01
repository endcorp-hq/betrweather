# BetrWeather dApp Store Deployment Guide

## Prerequisites

- Android SDK build tools (36.0.0)
- Solana CLI tools
- dApp Store CLI tools
- Valid keystore and keypair files

## Initial Setup

### 1. Initialize dApp Store Configuration
```bash
npx dapp-store init
```

### 2. Install Android Build Tools
```bash
~/Library/Android/sdk/cmdline-tools/latest/bin/sdkmanager "build-tools;36.0.0"
```

### 3. Create Release Keystore
```bash
keytool -genkey -v -keystore release-key.keystore -alias betrweather -keyalg RSA -keysize 2048 -validity 50000
```

### 4. Sign APK
```bash
~/Library/Android/sdk/build-tools/36.0.0/apksigner sign \
    --ks ./dapp-store-signing-keys/release-key.keystore \
    --ks-key-alias betrweather \
    --out ./dapp-store-build/betrweather-v1.0.0-signed.apk \
    ./dapp-store-build/betrweather-v1.0.0-unsigned.apk
``` 

### 5. Generate Solana Keypair
```bash
solana-keygen new --outfile ./dapp-store-signing-keys/betr_weather_deployment.json
```

### 6. Fund Keypair (Devnet)
```bash
solana airdrop 2 <PUBLIC_KEY> -u devnet
```

## Deployment Process

### 0. cd to publishing
```
cd publishing
```

### 1. Validate Configuration
```bash
npx dapp-store validate -k ../dapp-store-signing-keys/betr_weather_deployment.json -b ~/Library/Android/sdk/build-tools/36.0.0
```

### 2. Create App NFT (Devnet)
```bash
npx dapp-store create app -k ../dapp-store-signing-keys/betr_weather_deployment.json -u "https://devnet.helius-rpc.com/?api-key=<API_KEY>" --dry-run
npx dapp-store create app -k ../dapp-store-signing-keys/betr_weather_deployment.json -u "https://devnet.helius-rpc.com/?api-key=<API_KEY>"
```

### 3. Create App NFT (Mainnet)
```bash
npx dapp-store create app -k ../dapp-store-signing-keys/betr_weather_deployment.json -u "https://mainnet.helius-rpc.com/?api-key=<API_KEY>"
```

**App NFT Address:** `J7UMc5FA2g9drg49jhiApvYroEHCCxxyh32BtEBX4NZB`
- [Mainnet Explorer](https://explorer.solana.com/address/J7UMc5FA2g9drg49jhiApvYroEHCCxxyh32BtEBX4NZB?cluster=mainnet)

### 4. Create Release NFT
```bash
npx dapp-store create release -k ../dapp-store-signing-keys/betr_weather_deployment.json -a J7UMc5FA2g9drg49jhiApvYroEHCCxxyh32BtEBX4NZB -b ~/Library/Android/sdk/build-tools/36.0.0 -u "https://mainnet.helius-rpc.com/?api-key=<API_KEY>"
```

**Release NFT Address:** `9nrcHJt2f67zs9vsbi5UBR9WwGdgkxbeUoMsQn1LuWPc`
- [Mainnet Explorer](https://explorer.solana.com/address/9nrcHJt2f67zs9vsbi5UBR9WwGdgkxbeUoMsQn1LuWPc?cluster=mainnet)

### 5. Submit for Review
```bash
npx dapp-store publish submit -k ../dapp-store-signing-keys/betr_weather_deployment.json -u "https://mainnet.helius-rpc.com/?api-key=<API_KEY>" --requestor-is-authorized --complies-with-solana-dapp-store-policies
```

## Updating Your dApp

For new versions, you need to mint a new Release NFT:

1. **Build and sign new APK** with updated version number
2. **Create new Release NFT:**
   ```bash
   npx dapp-store create release -k ../dapp-store-signing-keys/betr_weather_deployment.json -a J7UMc5FA2g9drg49jhiApvYroEHCCxxyh32BtEBX4NZB -b ~/Library/Android/sdk/build-tools/36.0.0 -u "https://mainnet.helius-rpc.com/?api-key=<API_KEY>"
   ```
3. **Submit for review** using the same submit command

## Post-Submission

1. Join [Solana Mobile Discord](https://discord.gg/solanamobile)
2. Get developer role in `#developer` channel
3. Post in `#dapp-store` channel that you've completed app submission
4. Wait for review (3-4 business days for new apps, 1-2 for updates)

## Important Notes

- Use `--dry-run` flag to test commands before actual execution

## Troubleshooting

- **"Incorrect account owner" error:** Ensure you're using the correct keypair that owns the App NFT - note you may get this error when you try to publish to devnet as a test... 
- **"Already submitted" error:** This version has already been submitted for review
- **Validation errors:** Check `config.yaml` for proper formatting and required fields

## Resources

- [Solana Mobile dApp Publishing Documentation](https://docs.solanamobile.com/dapp-publishing/submit)
- [Solana Mobile Discord](https://discord.gg/solanamobile)