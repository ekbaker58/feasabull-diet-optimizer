/** readPerson/writePerson round-trips, with a stand-in for localStorage. */
const store = new Map();
globalThis.window = { localStorage: {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, v),
}};
const { readPerson, writePerson, missingFields, DEFAULT_FORM, EMPTY_PERSON } =
  await import('../src/lib/person.js');

let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗ ' + m); } else console.log('  ✓ ' + m); };

ok(readPerson() === null, 'empty storage reads as null');

// a calculator form, imperial, typed field by field
writePerson({ units:'imperial', sex:'female', age:'22', ft:'5', inch:'4', lb:'130',
              cm:'', kg:'', activityId:'low', goal:'lose' });
const back = readPerson();
ok(back.sex === 'female' && back.age === '22' && back.lb === '130', 'round-trips what was typed');
ok(back.activityId === 'low' && back.goal === 'lose', 'activity and goal survive');

// partial entry: only an age so far
store.clear();
writePerson({ ...Object.fromEntries(Object.keys(DEFAULT_FORM).map(k => [k, ''])), age:'19' });
const partial = readPerson();
ok(partial && partial.age === '19', 'a half-filled form still saves');
ok(partial.age === '19', 'the field they did fill still carries across');

// --- the trap this design exists to avoid -------------------------------
// Someone types only their age on the calculator and opens the planner.
const restored = { ...EMPTY_PERSON, ...partial };
ok(restored.age === '19', 'their age survives onto the planner');
ok(restored.ft === '' && restored.lb === '', 'their blank height and weight stay blank');
const mixed = { ...DEFAULT_FORM, ...partial };
ok(mixed.ft === '' && mixed.lb === '',
   'even merged onto the example, blanks written as blank stay blank');

// missingFields is what lets the planner tell "not yet" from "wrong"
ok(JSON.stringify(missingFields(restored)) === JSON.stringify(['sex', 'height', 'weight']),
   'missingFields names exactly what is not filled in: ' + JSON.stringify(missingFields(restored)));
ok(missingFields(DEFAULT_FORM).length === 0,
   'the example person is complete, so a first-time visitor gets a plan');
ok(missingFields(EMPTY_PERSON).length === 4, 'a blank person is missing all four');
ok(JSON.stringify(missingFields({ ...EMPTY_PERSON, units: 'metric', sex: 'female', age: '30', cm: '170' }))
     === JSON.stringify(['weight']),
   'metric: a filled cm counts as a height, a blank kg counts as a missing weight');
ok(missingFields({ ...DEFAULT_FORM, lb: '   ' }).includes('weight'),
   'whitespace is not a weight');

// nulls (the calculator starts with sex: null) must not become the string "null"
store.clear();
writePerson({ units:'imperial', sex:null, age:'30' });
ok(readPerson().sex === undefined, 'a null sex is skipped, not stored as "null"');

// junk in storage must not break the form
store.clear(); store.set('feasabull:person', '{not json');
ok(readPerson() === null, 'malformed storage reads as null');
store.set('feasabull:person', '{"sex":{"evil":1},"age":"25"}');
const sanitized = readPerson();
ok(sanitized.sex === undefined && sanitized.age === '25', 'non-string fields are dropped');
store.set('feasabull:person', '{"hacked":"yes","age":"25"}');
ok(readPerson().hacked === undefined, 'unknown keys are dropped');

// storage that throws (private window)
globalThis.window.localStorage.getItem = () => { throw new Error('blocked'); };
ok(readPerson() === null, 'blocked storage degrades to null instead of throwing');
globalThis.window.localStorage.setItem = () => { throw new Error('blocked'); };
writePerson({ age: '21' });
ok(true, 'blocked write does not throw');

console.log(fails ? `\n${fails} FAILURE(S)` : '\nperson storage: all good');
process.exit(fails ? 1 : 0);
