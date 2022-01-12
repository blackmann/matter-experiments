// Create the boxes

import {
  Bodies,
  Composite,
  Composites,
  Engine,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
} from "matter-js";

const boxes = [];

boxes.push(Bodies.rectangle(100, 50, 80, 80));
boxes.push(Bodies.rectangle(120, 140, 80, 80));

const ground = Bodies.rectangle(0, 500, 1000, 10, { isStatic: true });

const engine = Engine.create();
Composite.add(engine.world, [ ground]);

const render = Render.create({
  engine,
  canvas: document.querySelector("#playground"),
  options: {},
});

const mouse = Mouse.create();
const mouseConstraint = MouseConstraint.create(engine, {
  mouse,
  constraint: {
    stiffness: 0.1,
    render: {
      visible: false,
    },
  },
});

const stack = Composites.pyramid(100, 100, 10, 6, 0, 0, function (x, y) {
  return Bodies.circle(x, y, 10);
});

Composite.add(engine.world, stack)

Composite.add(engine.world, mouseConstraint);

Render.run(render);

const runner = Runner.create();
Runner.run(runner, engine);
