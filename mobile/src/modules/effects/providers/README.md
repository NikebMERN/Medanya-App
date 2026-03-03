# Effects Providers

## stub.provider.js
Placeholder when no SDK is integrated. Returns `applied: false` for all operations.

## Future providers

### deepar.provider.js
- Integrate DeepAR SDK
- setBeauty, setLut, setArEffect
- Export: `getDeeparProvider(config)`

### banuba.provider.js
- Integrate Banuba SDK
- setBeauty, setLut, setArEffect
- Export: `getBanubaProvider(config)`

### agora.provider.js
- Agora FaceUnity/BytePlus extensions (often live-only)
- setBeauty for live streams

## Usage
```js
import { setEffectsProvider } from '../effects.engine';
import { getDeeparProvider } from './providers/deepar.provider';
setEffectsProvider(getDeeparProvider({ licenseKey: '...' }));
```
