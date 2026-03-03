/**
 * Effects Engine - unified interface for beauty, LUT, AR effects.
 * Pluggable providers: stub, DeepAR, Banuba, Agora Extensions.
 */
import { getStubProvider } from "./providers/stub.provider";

let _provider = null;

export function getEffectsProvider() {
  if (!_provider) {
    _provider = getStubProvider();
  }
  return _provider;
}

export function setEffectsProvider(provider) {
  _provider = provider;
}

export function setBeauty(level) {
  return getEffectsProvider().setBeauty(level);
}

export function setLut(filterId) {
  return getEffectsProvider().setLut(filterId);
}

export function setArEffect(effectId) {
  return getEffectsProvider().setArEffect(effectId);
}

export function clearEffects() {
  return getEffectsProvider().clearEffects();
}
