/** Microcopy del producto (docs/10). */
export const COPY = {
	subtitle: 'Acércate al horizonte. Mira cómo cambia el tiempo.',
	clocksIntro: 'Compara un reloj sostenido cerca del agujero negro con uno muy lejano.',
	observerLabel: 'Radio desde el centro',
	lockRs: 'Mantener distancia en rs al cambiar masa',
	lockKm: 'Mantener distancia en km al cambiar masa',
	referenceClock: 'Reloj de referencia · muy lejos',
	localClock: 'Reloj local · observador estático',
	clockScale: 'Relojes didácticos: 1 s de referencia por segundo de reproducción, a ×1.',
	observerMoving: 'Comparamos ritmos de relojes recolocados lentamente; el traslado no se simula.',
	nearHorizon: 'Mantenerse estático tan cerca exigiría una aceleración enorme.',
	grid: 'Malla ilustrativa; no representa literalmente el espacio-tiempo.',
	disk: 'Disco artístico; no se calcula la física del gas ni su emisión.',
	captured: 'Capturada. El cálculo se detiene justo fuera del horizonte.',
	outOfView: 'Fuera del área de simulación.',
	solverError: 'No se pudo mantener la precisión. Reinicia o ajusta las condiciones.',
	budget: 'Se alcanzó el límite de cálculo. La trayectoria mostrada es parcial.',
	photonCritical: 'Cerca del impacto crítico, pequeñas diferencias cambian mucho la trayectoria.',
	photonTime: 'Los fotones no tienen un reloj propio. La animación usa tiempo coordenado.',
	newton: 'Modelo clásico con frontera de captura impuesta; no incluye un horizonte relativista.',
	schwarzschild: 'Geodésicas de un agujero negro sin rotación ni carga.',
	autoFrame:
		'Vista en unidades rs: aumentar la masa cambia km, no el tamaño relativo de la escena.',
	hiddenPause: 'Pausado al cambiar de pestaña. Puedes continuar cuando quieras.',
	massRestart: 'Masa cambiada: relojes y trayectorias reiniciados.'
} as const;

export const STATUS_LABEL = {
	active: 'En curso',
	captured: 'Capturada · cálculo detenido cerca del horizonte',
	'out-of-view': 'Fuera del área de simulación',
	escaped: 'Escapa · sin retorno',
	'budget-exceeded': 'Límite de cálculo · trayectoria parcial',
	'numerical-error': 'Error numérico'
} as const;

export const MODEL_LABEL = {
	schwarzschild: 'Schwarzschild',
	newtonian: 'Newton'
} as const;

export const EXPERIMENT_LABEL = {
	clocks: 'Relojes',
	orbits: 'Órbitas',
	photons: 'Fotones'
} as const;
