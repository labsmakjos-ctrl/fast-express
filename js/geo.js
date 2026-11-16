/* =====================================================================
   FAST EXPRESS — accès à la géolocalisation (FEGeo)
   ---------------------------------------------------------------------
   Un seul point d'entrée pour la position du livreur :
   - aujourd'hui : navigateur web (navigator.geolocation + Wake Lock) ;
   - demain : application Android avec Capacitor, sans changer le reste
     du code. Si l'app native contient les plugins
       @capacitor/geolocation                       (permission, position)
       @capacitor-community/background-geolocation  (service au premier plan)
     ils sont utilisés automatiquement.

   LIMITE DE LA VERSION WEB : quand l'application passe en arrière-plan ou
   que l'écran se verrouille, le navigateur suspend la localisation. Le suivi
   en arrière-plan n'est PAS garanti sur le web ; il ne l'est qu'avec
   l'application Android (service au premier plan + notification visible).

   Erreurs normalisées : { code: 1 refusée | 2 indisponible | 3 délai dépassé
                           | 0 non prise en charge, message }
   ===================================================================== */
(function () {
  'use strict';
  const cap = window.Capacitor;
  const isNative = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  const plugins = (isNative && cap.Plugins) || {};
  const NativeGeo = plugins.Geolocation || null;               // @capacitor/geolocation
  const BackgroundGeo = plugins.BackgroundGeolocation || null; // @capacitor-community/background-geolocation
  const web = !isNative && typeof navigator !== 'undefined' && 'geolocation' in navigator;
  let wakeLock = null;
  let wantAwake = false;

  function normErr(e) {
    if (!e) return { code: 2, message: 'Position indisponible' };
    if (typeof e.code === 'number' && e.code >= 0 && e.code <= 3) return { code: e.code, message: e.message || '' };
    const m = String(e.message || e);
    if (/denied|permission|NOT_AUTHORIZED/i.test(m)) return { code: 1, message: m };
    if (/timeout|timed out/i.test(m)) return { code: 3, message: m };
    return { code: 2, message: m };
  }
  /* Position au format du navigateur, quelle que soit la source */
  function normPos(p) {
    if (!p) return null;
    if (p.coords) return p;
    return { coords: { latitude: p.latitude, longitude: p.longitude, accuracy: p.accuracy, speed: p.speed, heading: p.bearing ?? p.heading },
      timestamp: p.time || Date.now() };
  }

  const FEGeo = {
    isNative,
    /* true seulement avec l'application Android et son service au premier plan */
    backgroundCapable: !!(isNative && BackgroundGeo),
    available() { return isNative ? !!(NativeGeo || BackgroundGeo) : web; },
    secureContext() { return isNative || (typeof window !== 'undefined' && window.isSecureContext !== false); },

    /* 'granted' | 'denied' | 'prompt' | 'unknown' (sans jamais afficher de demande) */
    async permission() {
      if (isNative && NativeGeo && NativeGeo.checkPermissions) {
        try { const s = await NativeGeo.checkPermissions(); const v = s.location || s.coarseLocation;
          return v === 'granted' ? 'granted' : v === 'denied' ? 'denied' : 'prompt'; } catch (e) { return 'unknown'; }
      }
      try { if (navigator.permissions && navigator.permissions.query) return (await navigator.permissions.query({ name: 'geolocation' })).state; } catch (e) { /* non pris en charge */ }
      return 'unknown';
    },
    /* Appelle cb('granted' | 'denied' | 'prompt') quand l'utilisateur change l'autorisation (web) */
    onPermissionChange(cb) {
      if (isNative) return;
      try { navigator.permissions.query({ name: 'geolocation' }).then((s) => { s.onchange = () => cb(s.state); }); } catch (e) { /* ignoré */ }
    },

    /* Une position réelle ; affiche la demande d'autorisation si nécessaire */
    getCurrent(opts) {
      const o = Object.assign({ enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }, opts || {});
      if (isNative && NativeGeo) {
        return (NativeGeo.requestPermissions ? NativeGeo.requestPermissions().catch(() => null) : Promise.resolve())
          .then(() => NativeGeo.getCurrentPosition(o)).then(normPos).catch((e) => { throw normErr(e); });
      }
      if (!web) return Promise.reject({ code: 0, message: 'Géolocalisation non prise en charge' });
      return new Promise((res, rej) => navigator.geolocation.getCurrentPosition((p) => res(normPos(p)), (e) => rej(normErr(e)), o));
    },

    /* Suivi continu. Renvoie une poignée à passer à clear(). */
    async watch(onPos, onErr, opts) {
      const o = Object.assign({ enableHighAccuracy: true, timeout: 45000, maximumAge: 30000 }, opts || {});
      if (isNative && BackgroundGeo) {
        const id = await BackgroundGeo.addWatcher({
          backgroundTitle: 'FAST EXPRESS · service en cours',
          backgroundMessage: 'Votre position est partagée pendant votre service.',
          requestPermissions: true, stale: false, distanceFilter: 0,
        }, (loc, err) => { if (err) onErr(normErr(err)); else onPos(normPos(loc)); });
        return { kind: 'background', id };
      }
      if (isNative && NativeGeo) {
        const id = await NativeGeo.watchPosition(o, (p, err) => { if (err) onErr(normErr(err)); else if (p) onPos(normPos(p)); });
        return { kind: 'native', id };
      }
      if (!web) { onErr({ code: 0, message: 'Géolocalisation non prise en charge' }); return null; }
      const id = navigator.geolocation.watchPosition((p) => onPos(normPos(p)), (e) => onErr(normErr(e)), o);
      return { kind: 'web', id };
    },
    clear(h) {
      if (!h) return;
      try {
        if (h.kind === 'background') BackgroundGeo.removeWatcher({ id: h.id });
        else if (h.kind === 'native') NativeGeo.clearWatch({ id: h.id });
        else navigator.geolocation.clearWatch(h.id);
      } catch (e) { /* déjà arrêté */ }
    },

    /* Garder l'écran allumé pendant le service (web). 'on' | 'native' | 'unsupported' | 'refused' */
    async keepAwake() {
      wantAwake = true;
      if (isNative) return 'native';
      if (!('wakeLock' in navigator)) return 'unsupported';
      try { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); return 'on'; }
      catch (e) { return 'refused'; }
    },
    awake() { return isNative ? wantAwake : !!wakeLock; },
    release() { wantAwake = false; if (wakeLock) { try { wakeLock.release(); } catch (e) { /* déjà libéré */ } wakeLock = null; } },
    /* Le navigateur libère le verrou quand la page est cachée : on le reprend au retour */
    async resume() { if (wantAwake && !isNative && !wakeLock) return this.keepAwake(); return null; },

    async battery() {
      try { const b = navigator.getBattery ? await navigator.getBattery() : null; if (b) return { level: Math.round(b.level * 100), charging: b.charging }; } catch (e) { /* non disponible */ }
      return {};
    },
  };
  window.FEGeo = FEGeo;
})();
