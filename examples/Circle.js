/** @class Circle representing a circle. */
class Circle {
    /**
     * Creates an instance of Circle.
     *
     * @constructor
     * @author: moi
     * @param {number} r The desired radius of the circle.
     */
      constructor(r) {
        /** @private */ this.radius = r
        /** @private */ this.circumference = 2 * Math.PI * r
      }
    
      /**
       * Creates a new Circle from a diameter.
       *
       * @param {number} d The desired diameter of the circle.
       * @return {Circle} The new Circle object.
       */
      static fromDiameter(d) {
        return new Circle(d / 2)
      }
    
      /**
       * Calculates the circumference of the Circle.
       *
       * @deprecated since 1.1.0; use getCircumference instead
       * @return {number} The circumference of the circle.
       */
      calculateCircumference() {
        return 2 * Math.PI * this.radius
      }
    
      /**
       * Returns the pre-computed circumference of the Circle.
       *
       * @return {number} The circumference of the circle.
       * @since 1.1.0
       */
      getCircumference() {
        return this.circumference
      }
    
      /**
       * Find a String representation of the Circle.
       *
       * @override
       * @return {string} Human-readable representation of this Circle.
       */
      toString() {
        return `[A Circle object with radius of ${this.radius}.]`
      }
    }
    
    /**
     * Prints a circle.
     *
     * @param {Circle} circle
     */
    function printCircle(circle) {
        /** @this {Circle} */
        function bound() { console.log(this) }
        bound.apply(circle)
    }
    