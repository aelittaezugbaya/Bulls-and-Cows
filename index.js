const pb2 = new PB2("https://pb2-2018.jelastic.metropolia.fi/", "bullsAndCows");

const responseTypes = {
  online: "online",
  guess: "guess",
  bullcow: "bullcow"
};

const statusTypes = {
  waitGuess: "waitGuess",
  waitBullCow: "waitBullCow",
  turn: "turn",
  response: "response",
  win: "win",
  loose: "loose"
};

function createTableRow(tableId) {
  const tr = document.createElement("tr");
  tr.appendChild(document.createElement("th"));
  tr.appendChild(document.createElement("th"));
  tr.appendChild(document.createElement("th"));
  $(`#${tableId}`).append(tr);
  return tr;
}

function createInput() {
  const input = document.createElement("input");
  $(input).attr("type", "number");
  return $(input);
}

function numberValid(number) {
  const unique = !/(.).*?\1/.test(`${number}`);
  return unique && number.length == 4 && number[0] != 0;
}

class Client {
  constructor() {
    this.number = 0;
    this.turn = 0;
    this.lastTableRow = null;
    this.opponentReady = false;
    this.start();
  }

  start() {
    pb2.setConnectionHandler(() => {
      pb2.sendJson({
        type: responseTypes.online
      });
      console.log("connect");
      this.changeConnectionStatus(true);
      this.turn = 1;
    });

    pb2.setDisconnectionHandler(() => {
      this.changeConnectionStatus(false);
    });

    pb2.setReceiver(this.recieve.bind(this));

    $("#save-number").click(() => {
      const value = $("#number-input").val();
      if (!numberValid(value)) {
        return;
      }

      this.number = value;

      $("#number-form").css("display", "none");
      $("#your-number").css("display", "block");
      $("#your-number").text("Your number: " + this.number);
      this.startGame();
    });
  }

  changeConnectionStatus(online) {
    if (online) {
      document.getElementById("client").textContent = "Online";
    } else {
      document.getElementById("client").textContent = "Offline";
    }
  }

  recieve(response) {
    console.log(response);
    if (!response.me) {
      switch (response.json.type) {
        case responseTypes.online:
          this.changeConnectionStatus(true);
          this.turn = 2;
          break;
        case responseTypes.guess:
          this.recieveGuess(response);
          break;
        case responseTypes.bullcow:
          this.recieveBullCow(response);
          break;
        default:
      }
    }
  }

  startGame() {
    $("#scores").css("display", "block");
    if (this.turn === 1) {
      this.writeGuess();
    } else {
      this.setStatus(statusTypes.waitGuess);
    }
  }

  setStatus(status) {
    switch (status) {
      case statusTypes.turn:
        $("#status").text("Your turn!");
        break;
      case statusTypes.response:
        $("#status").text("Answer to opponents guess!");
        break;
      case statusTypes.waitGuess:
        $("#status").text("Please wait for opponent's guess!");
        break;
      case statusTypes.waitBullCow:
        $("#status").text("Please wait for opponent's response!");
        break;
      case statusTypes.win:
        $("#status").text("YOU WIN! CONGRATS! Reload page for new game");
        break;
      case statusTypes.loose:
        $("#status").text("YOU LOST! :( Reload page for new game");
        break;
      default:
    }
  }

  writeGuess() {
    this.setStatus(statusTypes.turn);
    const tr = createTableRow("your-guess");
    const input = createInput();
    $(tr.firstChild).append(input);

    input.keydown(e => {
      if (e.keyCode !== 13 || !numberValid(input.val())) {
        return;
      }

      pb2.sendJson({
        type: responseTypes.guess,
        msg: input.val()
      });

      input.remove();
      $(tr.firstChild).text(input.val());
      this.setStatus(statusTypes.waitBullCow);
    });
  }

  recieveGuess(response) {
    this.setStatus(statusTypes.response);
    const tr = createTableRow("opponent-guess");
    const [guessCol, bullCol, cowCol] = $(tr).children();
    const bullInput = createInput();
    const cowInput = createInput();
    let bullValue, cowValue;

    $(guessCol).text(response.json.msg);
    $(bullCol).append(bullInput);

    bullInput.keydown(e => {
      if (e.keyCode !== 13) return;
      if (bullInput.val() < 0 || bullInput.val() > 4) return;

      bullValue = bullInput.val();
      bullInput.remove();
      $(bullCol).text(bullValue);

      $(cowCol).append(cowInput);
    });

    cowInput.keydown(e => {
      if (e.keyCode !== 13) return;
      if (cowInput.val() < 0 || cowInput.val() > 4) return;

      cowValue = cowInput.val();
      cowInput.remove();
      $(cowCol).text(cowValue);

      pb2.sendJson({
        type: responseTypes.bullcow,
        msg: {
          bull: bullValue,
          cow: cowValue
        }
      });
      if (bullValue == 4) {
        this.setStatus(statusTypes.loose);
        return;
      }
      this.writeGuess();
    });
  }

  recieveBullCow(response) {
    const tr = $("#your-guess")
      .children()
      .last();
    const [, bullCol, cowCol] = tr.children();

    $(bullCol).text(response.json.msg.bull);
    $(cowCol).text(response.json.msg.cow);
    if (response.json.msg.bull == 4) {
      this.setStatus(statusTypes.win);
      return;
    }
    this.setStatus(statusTypes.waitGuess);
  }
}

const client = new Client();
