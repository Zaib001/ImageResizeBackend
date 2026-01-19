class UnitConverter {
    constructor() {
        this.DPI = 96;
    }

    toPixels(value, unit) {
        if (value <= 0) return 0;

        switch (unit.toLowerCase()) {
            case 'px':
            case 'pixel':
            case 'pixels':
                return Math.round(value);
            case 'in':
            case 'inch':
            case 'inches':
                return Math.round(value * this.DPI);
            case 'cm':
            case 'centimeter':
            case 'centimeters':
                return Math.round((value / 2.54) * this.DPI);
            case 'mm':
            case 'millimeter':
            case 'millimeters':
                return Math.round((value / 25.4) * this.DPI);
            default:
                throw new Error(`Unsupported unit: ${unit}`);
        }
    }

    validateDimensions(width, height) {
        const MAX_DIMENSION = 16384;
        const MIN_DIMENSION = 1;

        if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
            throw new Error('Dimensions must be positive nonzero numbers');
        }
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            throw new Error(`Dimensions exceed maximum limit of ${MAX_DIMENSION}px`);
        }
        return true;
    }
}

module.exports = new UnitConverter();
