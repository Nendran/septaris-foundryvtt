describe("calculateApplicableModifier", () => {
  const cases = [
    // Novice
    [-2, 1, -2],
    [0, 1, 0],
    [3, 1, 3],

    // Adepte
    [-2, 2, -1],
    [0, 2, 1],
    [3, 2, 6],

    // Expert
    [-2, 3, 0],
    [0, 3, 2],
    [3, 3, 9],
  ];

  for (const [modifier, proficiency, expected] of cases) {
    it(`${modifier}, rank ${proficiency} => ${expected}`, () => {
      assert.equal(
        calculateApplicableModifier(
          modifier,
          proficiency,
        ),
        expected,
      );
    });
  }
});