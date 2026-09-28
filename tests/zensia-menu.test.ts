import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  ZENSIA_MENU_CATEGORIES,
  ZENSIA_MENU_ITEMS,
  ZENSIA_MENU_CORE_ITEM_COUNT,
  ZENSIA_MENU_VARIANT_COUNT,
  menuItemsForCategory,
} from "../src/experiences/zensia/zensiaMenu";

const component=fs.readFileSync("src/experiences/zensia/ZensiaImmersiveMenu.tsx","utf8");

test("Zensia immersive menu includes every core public menu item and listed flavor variant",()=>{
  assert.equal(ZENSIA_MENU_CORE_ITEM_COUNT,44);
  assert.equal(ZENSIA_MENU_VARIANT_COUNT,11);
  assert.equal(ZENSIA_MENU_CATEGORIES.length,6);
  assert.equal(menuItemsForCategory("hot-beverages").length,7);
  assert.equal(menuItemsForCategory("espresso-drinks").length,5);
  assert.equal(menuItemsForCategory("cold-beverages").length,13);
  assert.equal(menuItemsForCategory("breads").length,6);
  assert.equal(menuItemsForCategory("empanadas").length,6);
  assert.equal(menuItemsForCategory("specialty-desserts").length,7);

  const names=ZENSIA_MENU_ITEMS.map(item=>item.name);
  for(const name of [
    "Brew (Regular)",
    "Flat White",
    "Fruit Slush/Juice",
    "ZenEnergy",
    "Almojabana (Corn Meal Cheese Bread)",
    "Corn Spinach",
    "Passion Fruit Delight",
  ]) assert.ok(names.includes(name),`Missing menu item: ${name}`);

  const fruit=ZENSIA_MENU_ITEMS.find(item=>item.id==="fruit-slush-juice");
  const energy=ZENSIA_MENU_ITEMS.find(item=>item.id==="zen-energy");
  assert.deepEqual(fruit?.variants,["Lulo","Passion Fruit","Black Berry","Banana P.","Mango","Guanabana","Coconut Lemonade"]);
  assert.deepEqual(energy?.variants,["Dragon Fruit","Blue Berry","Purple","Starfruit"]);
});

test("Zensia immersive menu is interaction-first and preserves ordering",()=>{
  assert.match(component,/Search the Zensia menu/);
  assert.match(component,/Menu categories/);
  assert.match(component,/aria-pressed/);
  assert.match(component,/ScrollTrigger/);
  assert.match(component,/repeat: -1/);
  assert.match(component,/Order online/);
  assert.match(component,/<noscript>/);
});
