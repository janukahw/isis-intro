/* MEQuiz — tiny quiz engine with instant feedback. No persistence.
   MEQuiz.render(el, [{ q, choices: [...], answer: index, why }]) */
(function () {
  "use strict";

  function render(el, questions) {
    el.classList.add("quiz");
    var score = 0, answered = 0;

    var scoreEl = document.createElement("p");
    scoreEl.className = "quiz-score";
    scoreEl.textContent = "CHECK YOURSELF — 0 / " + questions.length;
    el.append(scoreEl);

    questions.forEach(function (item, qi) {
      var box = document.createElement("div");
      box.className = "quiz-q";

      var qText = document.createElement("p");
      qText.className = "q-text";
      qText.textContent = (qi + 1) + ". " + item.q;
      box.append(qText);

      var choices = document.createElement("div");
      choices.className = "quiz-choices";
      var buttons = [];

      item.choices.forEach(function (choice, ci) {
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-choice";
        btn.textContent = choice;
        btn.addEventListener("click", function () {
          buttons.forEach(function (b) { b.disabled = true; });
          buttons[item.answer].classList.add("correct");
          var right = ci === item.answer;
          if (right) score++;
          else btn.classList.add("wrong");
          answered++;
          scoreEl.textContent = "CHECK YOURSELF — " + score + " / " + questions.length +
            (answered === questions.length
              ? (score === questions.length ? "  ✓ beam on." : "  — review the highlighted answers, or try again.")
              : "");

          var why = document.createElement("p");
          why.className = right ? "quiz-why" : "quiz-why wrong";
          why.textContent = item.why;
          box.append(why);

          if (answered === questions.length) {
            var retry = document.createElement("button");
            retry.type = "button";
            retry.className = "btn ghost";
            retry.textContent = "↺ try again";
            retry.addEventListener("click", function () {
              el.replaceChildren();
              render(el, questions);
            });
            el.append(retry);
          }
        });
        buttons.push(btn);
        choices.append(btn);
      });

      box.append(choices);
      el.append(box);
    });
  }

  window.MEQuiz = { render: render };
})();
