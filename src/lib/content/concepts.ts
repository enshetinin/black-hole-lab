/** Conceptos ampliables (docs/10). */
export const CONCEPTS = [
	{
		term: 'Horizonte de sucesos',
		text: 'Frontera causal de este modelo: desde dentro ninguna señal puede salir al exterior. La app dibuja su radio geométrico (1 rs) y no simula el interior.'
	},
	{
		term: 'Radio de Schwarzschild',
		text: 'Escala fijada por la masa, rs = 2GM/c². Una masa solar con nuestras constantes da unos 2,95 km. No es un parámetro independiente de la masa.'
	},
	{
		term: 'Dilatación gravitatoria',
		text: 'Un reloj estático en r avanza respecto a uno ideal muy lejano a razón √(1 − rs/r). Cada reloj mide normalmente su propio tiempo; lo que cambia es la comparación. Sostenerse cerca del horizonte exige una aceleración enorme.'
	},
	{
		term: 'Esfera de fotones (1,5 rs)',
		text: 'Radio de una órbita circular de luz inestable. No es una capa de fotones pegados para siempre ni una pared que todo rayo deba seguir.'
	},
	{
		term: 'ISCO (3 rs)',
		text: 'Límite de estabilidad de órbitas circulares de partículas con masa: estables fuera, marginal en 3 rs, inestables entre 1,5 y 3 rs. No es una pared ni un segundo horizonte.'
	},
	{
		term: 'Precesión',
		text: 'La dirección del periastro cambia entre vueltas. La comparación usa el mismo evento inicial y la misma T coordenada para ambos modelos; la diferencia no es decorativa.'
	},
	{
		term: 'Parámetro de impacto',
		text: 'B = ℓ/E caracteriza la trayectoria de la luz; para un rayo que llega desde muy lejos es la separación perpendicular. Para un emisor finito se obtiene del ángulo local, no de un desplazamiento en pantalla.'
	},
	{
		term: 'Tiempo coordenado y propio',
		text: 'T etiqueta eventos con la coordenada temporal de Schwarzschild; τ mide el reloj de una partícula con masa. El parámetro afín de un fotón es una herramienta de cálculo, no un reloj.'
	},
	{
		term: 'Sombra',
		text: 'La sombra observada tiene un tamaño ligado al impacto crítico (≈ 2,6 rs) y depende del observador. El círculo negro de la vista a escala es el horizonte, no la sombra.'
	}
] as const;
