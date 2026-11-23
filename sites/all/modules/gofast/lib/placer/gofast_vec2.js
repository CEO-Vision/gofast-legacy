/**
 * @typedef {object} Vec2Like 2D Vector-like interface, requires the
 *  presence of 2 components.
 * @property {number} x The X axis component (first component)
 * @property {number} y The y axis component (second component)
 */
((Gofast) => {
  // define namespace
  const placerLib = (Gofast.placerLib ??= {});

  /**
   * Namespace class for operations on 2D vector or vector-like objects.
   *
   * The provided operation should be done immutably.
   */
  class Vec2 {
    /**
     * Negate a vector
     * @param {Vec2Like} vec Vector to negate.
     * @returns {Vec2Like} Negated vector.
     */
    static neg(vec) {
      return { x: -vec.x, y: -vec.y };
    }

    /**
     * Add vector by vector (component-wise)
     *
     * `lhs + rhs`
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {Vec2Like} rhs Right-hand side operand.
     * @returns {Vec2Like} Sum result vector.
     */
    static add(lhs, rhs) {
      return {
        x: lhs.x + rhs.x,
        y: lhs.y + rhs.y,
      };
    }

    /**
     * subtract vector by vector (component-wise)
     *
     * `lhs - rhs`
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {Vec2Like} rhs Right-hand side operand.
     * @returns {Vec2Like} Difference result vector.
     */
    static sub(lhs, rhs) {
      return {
        x: lhs.x - rhs.x,
        y: lhs.y - rhs.y,
      };
    }

    /**
     * multiply vector by vector (component-wise)
     *
     * `lhs * rhs`
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {Vec2Like} rhs Right-hand side operand.
     * @returns {Vec2Like} Multiplication result vector.
     */
    static mul(lhs, rhs) {
      return {
        x: lhs.x * rhs.x,
        y: lhs.y * rhs.y,
      };
    }

    /**
     * divide vector by vector (component-wise)
     *
     * `lhs / rhs`
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {Vec2Like} rhs Right-hand side operand.
     * @returns {Vec2Like} Division result vector.
     */
    static div(lhs, rhs) {
      return {
        x: lhs.x / rhs.x,
        y: lhs.y / rhs.y,
      };
    }

    /**
     * multiply vector by scalar (number)
     *
     * `lhs * v`
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {number} v Scalar number
     * @returns {Vec2Like} Multiplication result.
     */
    static mulS(lhs, v) {
      return {
        x: lhs.x * v,
        y: lhs.y * v,
      };
    }
    /**
     * divide vector by scalar (number)
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {number} v Scalar number
     * @returns {Vec2Like} Division result.
     */
    static divS(lhs, v) {
      return {
        x: lhs.x / v,
        y: lhs.y / v,
      };
    }

    /**
     * Checks equality between vector like objects by value.
     *
     * @param {Vec2Like} lhs Left-hand side operand.
     * @param {Vec2Like} rhs Right-hand side operand.
     * @returns {boolean}
     */
    static eq(lhs, rhs) {
      return lhs.x === rhs.x && lhs.y === rhs.y;
    }

    /**
     * get null vector
     * @returns {Vec2Like}
     */
    static zero = () => ({
      x: 0,
      y: 0,
    });

    /**
     * get "one" vector
     * @returns {Vec2Like}
     */
    static one = () => ({
      x: 1,
      y: 1,
    });

    /**
     * get x unit vector
     * @returns {Vec2Like}
     */
    static x = () => ({
      x: 1,
      y: 0,
    });

    /**
     * get y unit vector
     * @returns {Vec2Like}
     */
    static y = () => ({
      x: 0,
      y: 1,
    });
  }

  placerLib.Vec2 = Vec2;
})(Gofast);
