import Matter, {
  Bodies,
  Body,
  Collision,
  Common,
  Composite,
  Engine,
  Events,
  Mouse,
  Render,
  Runner,
  Vector,
} from "matter-js"
import MatterAttractors from "matter-attractors"
import MatterWrap from "matter-wrap"

// Constants

const RENDER_WIDTH = 500
const RENDER_HEIGHT = 400

// Plugin registrations

Matter.use(MatterAttractors)
Matter.use(MatterWrap)

// Maps

const asteroidRandomSpawnMap = {
  t: {
    getX: () => Common.random(0, RENDER_WIDTH),
    getY: () => 0,
    getVelocity: () => Vector.create(Common.random(-1, 1), 1),
  },
  r: {
    getX: () => RENDER_WIDTH,
    getY: () => Common.random(0, RENDER_HEIGHT),
    getVelocity: () => Vector.create(-1, Common.random(-1, 1)),
  },
  b: {
    getX: () => Common.random(0, RENDER_WIDTH),
    getY: () => RENDER_HEIGHT,
    getVelocity: () => Vector.create(Common.random(-1, 1), -1),
  },
  l: {
    getX: () => 0,
    getY: () => Common.random(0, RENDER_HEIGHT),
    getVelocity: () => Vector.create(-1, Common.random(-1, 1)),
  },
}

export default function main() {
  // Engine set up

  const engine = Engine.create()
  engine.gravity.y = 0.0

  const render = Render.create({
    canvas: document.querySelector("#playground"),
    engine,
    options: {
      width: RENDER_WIDTH,
      height: RENDER_HEIGHT,
      wireframeBackground: "#333",
      // showStats: true
    },
  })

  Render.run(render)

  const runner = Runner.create()
  Runner.run(runner, engine)

  // World/objects set up

  const shipGroup = Body.nextGroup(true)

  const spaceShip = Bodies.rectangle(
    RENDER_WIDTH / 2,
    RENDER_HEIGHT / 2,
    20,
    20,
    {
      collisionFilter: { group: shipGroup },
      plugin: {
        attractors: [
          function (_, body) {
            if (body.collisionFilter.group === shipGroup) {
              return
            }

            Body.setVelocity(body, body._assignedVelocity)
          },
        ],
      },
    }
  )

  Composite.add(engine.world, spaceShip)

  const mouse = Mouse.create()

  Composite.add(engine.world, mouse)

  // Game loop

  const ammoGenerationInterval = setInterval(() => {
    const ammo = Bodies.circle(spaceShip.position.x, spaceShip.position.y, 5, {
      collisionFilter: { group: shipGroup },
    })

    // 1.56 is callibrated
    Body.setVelocity(
      ammo,
      Vector.rotate(Vector.create(0, 4), spaceShip.angle - 1.56)
    )

    Composite.add(engine.world, ammo)
  }, 750)

  const asteroidGroup = Body.nextGroup()

  const asteroidGenerationInterval = setInterval(() => {
    const randomPosition = Common.choose("trbl")
    const positionGenerator = asteroidRandomSpawnMap[randomPosition]

    const asteroid = Bodies.circle(
      positionGenerator.getX(),
      positionGenerator.getY(),
      Common.random(10, 50),
      {
        collisionFilter: { group: asteroidGroup },
        plugin: {
          wrap: {
            min: { x: 0, y: 0 },
            max: { x: RENDER_WIDTH, y: RENDER_HEIGHT },
          },
        },
      }
    )

    // When an asteroid spawns close to another, it creates an "impulsive" force
    // that pushes the existing asteroid far and fast. Not cool!

    for (let rock of engine.world.bodies.filter(
      (body) => body.collisionFilter.group === asteroidGroup
    )) {
      if (Collision.collides(asteroid, rock)) {
        return
      }
    }

    asteroid._assignedVelocity = positionGenerator.getVelocity()

    Composite.add(engine.world, asteroid)
  }, 2000)

  // Events

  Events.on(engine, "afterUpdate", () => {
    const angle = Vector.angle(spaceShip.position, mouse.position)

    Body.setAngle(spaceShip, angle)
  })

  Events.on(engine, "collisionStart", (event) => {
    event.pairs.forEach((pair) => {
      const { bodyA, bodyB } = pair
      const bodies = [bodyA, bodyB]

      // if a rock hits the space ship game over
      if (bodies.includes(spaceShip)) {
        if (
          bodies.filter((body) => body.collisionFilter.group === asteroidGroup)
        ) {
          endGame()
          return
        }
      }

      // they're both rocks
      if (
        bodies
          .map(({ collisionFilter: { group } }) =>
            group === asteroidGroup ? 1 : 0
          )
          .reduce((a, b) => a + b) === 2
      ) {
        return
      }

      const ammo = bodies.filter(
        ({ collisionFilter: { group } }) => group === shipGroup
      )

      bodies.splice(bodies.indexOf(ammo), 1)

      Composite.remove(engine.world, ammo)

      const [rock] = bodies
      Composite.remove(engine.world, rock)

      // if the rock is huge divide it
      if (rock.circleRadius > 30) {
        const division = Common.random(0.1, 0.7)
        const remainder = 1 - division

        const rockSplit1 = Bodies.circle(
          rock.position.x + (division * rock.circleRadius) / 2,
          rock.position.y + (division * rock.circleRadius) / 2,
          division * rock.circleRadius,
          { collisionFilter: { group: asteroidGroup } }
        )

        rockSplit1._assignedVelocity = Vector.mult(rock._assignedVelocity, -0.5)
        Composite.add(engine.world, rockSplit1)

        const rockSplit2 = Bodies.circle(
          rock.position.x - (remainder * rock.circleRadius) / 2 + 0.1,
          rock.position.y - (remainder * rock.circleRadius) / 2 + 0.1,
          remainder * rock.circleRadius,
          { collisionFilter: { group: asteroidGroup } }
        )

        rockSplit2._assignedVelocity = Vector.mult(
          rockSplit1._assignedVelocity,
          -1
        )
        Composite.add(engine.world, rockSplit2)
      }
    })
  })

  // Helpers

  function endGame() {
    clearInterval(asteroidGenerationInterval)
    clearInterval(ammoGenerationInterval)

    Render.stop(render)
    Runner.stop(runner)
  }
}
