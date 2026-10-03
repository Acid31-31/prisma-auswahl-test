(function () {
    var canvas = document.createElement("canvas");
    canvas.className = "bg-field";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
    var ctx = canvas.getContext("2d");
    var green = "57, 255, 140";
    var font = {
        "0": [14, 17, 19, 21, 25, 17, 14],
        "1": [4, 12, 4, 4, 4, 4, 14],
        "2": [14, 17, 1, 2, 4, 8, 31],
        "3": [30, 1, 1, 14, 1, 1, 30],
        "4": [2, 6, 10, 18, 31, 2, 2],
        "5": [31, 16, 16, 30, 1, 1, 30],
        "6": [14, 16, 16, 30, 17, 17, 14],
        "7": [31, 1, 2, 4, 8, 8, 8],
        "8": [14, 17, 17, 14, 17, 17, 14],
        "9": [14, 17, 17, 15, 1, 1, 14],
        "A": [14, 17, 17, 31, 17, 17, 17],
        "B": [30, 17, 17, 30, 17, 17, 30],
        "C": [14, 17, 16, 16, 16, 17, 14],
        "D": [30, 17, 17, 17, 17, 17, 30],
        "E": [31, 16, 16, 30, 16, 16, 31],
        "F": [31, 16, 16, 30, 16, 16, 16],
        "G": [14, 17, 16, 23, 17, 17, 15],
        "H": [17, 17, 17, 31, 17, 17, 17],
        "I": [14, 4, 4, 4, 4, 4, 14],
        "L": [16, 16, 16, 16, 16, 16, 31],
        "M": [17, 27, 21, 21, 17, 17, 17],
        "N": [17, 25, 21, 19, 17, 17, 17],
        "O": [14, 17, 17, 17, 17, 17, 14],
        "P": [30, 17, 17, 30, 16, 16, 16],
        "R": [30, 17, 17, 30, 20, 18, 17],
        "S": [15, 16, 16, 14, 1, 1, 30],
        "T": [31, 4, 4, 4, 4, 4, 4],
        "U": [17, 17, 17, 17, 17, 17, 14],
        "Y": [17, 17, 17, 10, 4, 4, 4],
        "=": [0, 31, 0, 31, 0, 0, 0],
        "$": [4, 15, 20, 14, 5, 30, 4],
        "%": [25, 26, 2, 4, 8, 11, 19],
        "(": [2, 4, 8, 8, 8, 4, 2],
        ")": [8, 4, 2, 2, 2, 4, 8],
        "_": [0, 0, 0, 0, 0, 0, 31],
        " ": [0, 0, 0, 0, 0, 0, 0]
    };
    var algo = [
        "if state = true then",
        "  transmit(false)",
        "  oldstate = state",
        "end if",
        "if state = false then",
        "  transmit(true)",
        "  oldstate = state",
        "end if",
        "end sub",
        "main:",
        "OPTION_REG = $84",
        "TRISIO = %00100000",
        "assign prescaler to TMR0",
        "designate GPIO as output",
        "status = ready"
    ];
    var code = [
        "IF STATE = TRUE THEN",
        "TRANSMIT(FALSE)",
        "OLDSTATE = STATE",
        "END IF",
        "IF STATE = FALSE THEN",
        "TRANSMIT(TRUE)",
        "END SUB",
        "MAIN",
        "OPTION_REG = $84",
        "TRISIO = %00100000",
        "ASSIGN PRESCALER TO TMR0",
        "DESIGNATE GPIO AS OUTPUT",
        "STATUS = READY"
    ];
    var lines = [];
    var li;
    for (li = 0; li < code.length; li++) {
        var baked = [];
        var ci;
        for (ci = 0; ci < code[li].length; ci++) {
            var ch = code[li].charAt(ci);
            if (ch !== " " && Math.random() < 0.28) {
                baked.push("*" + (Math.floor(Math.random() * 8)));
            } else {
                baked.push(font[ch] ? ch : " ");
            }
        }
        lines.push(baked);
    }

    function drawDigital(ch, x, y, cell) {
        var rows = font[ch];
        if (!rows) {
            return;
        }
        var r;
        var c;
        for (r = 0; r < 7; r++) {
            var bits = rows[r];
            for (c = 0; c < 5; c++) {
                if ((bits >> (4 - c)) & 1) {
                    ctx.fillRect(x + c * cell, y + r * cell, cell * 0.82, cell * 0.82);
                }
            }
        }
    }

    function drawAlien(kind, x, y, cell, outline, color) {
        var u = cell * 5;
        var v = cell * 7;
        var neon = color || "rgb(18, 72, 170)";
        function markFill() {
            if (outline) {
                ctx.strokeStyle = neon;
                ctx.stroke();
            } else {
                ctx.fill();
            }
        }
        function markRect(rx, ry, rw, rh) {
            if (outline) {
                ctx.strokeStyle = neon;
                ctx.strokeRect(rx, ry, rw, rh);
            } else {
                ctx.fillRect(rx, ry, rw, rh);
            }
        }
        ctx.save();
        ctx.translate(x, y);
        ctx.lineWidth = outline ? Math.max(1.6, cell * 0.7) : Math.max(1, cell * 0.45);
        ctx.strokeStyle = outline ? neon : ctx.fillStyle;
        ctx.beginPath();
        if (kind === 0) {
            ctx.arc(u * 0.5, v * 0.48, u * 0.32, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(u * 0.5, v * 0.48, cell * 0.45, 0, Math.PI * 2);
            markFill();
        } else if (kind === 1) {
            ctx.arc(u * 0.5, v * 0.55, u * 0.34, -0.4, 3.6);
            ctx.stroke();
            markRect(u * 0.42, cell, cell * 0.7, cell * 2);
        } else if (kind === 2) {
            ctx.moveTo(cell, v * 0.45);
            ctx.lineTo(u * 0.5, v * 0.32);
            ctx.lineTo(u - cell, v * 0.5);
            ctx.lineTo(u * 0.5, v * 0.64);
            ctx.closePath();
            markFill();
        } else if (kind === 3) {
            ctx.moveTo(cell, v * 0.25);
            ctx.lineTo(u * 0.7, v * 0.5);
            ctx.lineTo(cell, v * 0.75);
            ctx.moveTo(cell * 2, v * 0.35);
            ctx.lineTo(u * 0.55, v * 0.5);
            ctx.lineTo(cell * 2, v * 0.65);
            ctx.stroke();
        } else if (kind === 4) {
            ctx.arc(u * 0.5, v * 0.22, cell * 0.7, 0, Math.PI * 2);
            ctx.moveTo(u * 0.5 + cell * 0.7, v * 0.5);
            ctx.arc(u * 0.5, v * 0.5, cell * 0.7, 0, Math.PI * 2);
            ctx.moveTo(u * 0.5 + cell * 0.7, v * 0.78);
            ctx.arc(u * 0.5, v * 0.78, cell * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        } else if (kind === 5) {
            ctx.moveTo(cell, cell);
            ctx.lineTo(u - cell, v - cell);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cell * 1.3, v - cell * 1.6, cell * 0.45, 0, Math.PI * 2);
            ctx.arc(u - cell * 1.3, cell * 1.6, cell * 0.45, 0, Math.PI * 2);
            markFill();
        } else if (kind === 6) {
            var a;
            ctx.moveTo(u * 0.5, cell);
            for (a = 1; a <= 6; a++) {
                var ang = -Math.PI / 2 + a * Math.PI / 3;
                ctx.lineTo(u * 0.5 + Math.cos(ang) * u * 0.36, v * 0.5 + Math.sin(ang) * u * 0.36);
            }
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(u * 0.5, v * 0.5, cell * 0.4, 0, Math.PI * 2);
            markFill();
        } else {
            markRect(cell, cell, cell * 0.7, v * 0.55);
            markRect(u * 0.62, cell, cell * 0.7, v * 0.85);
            ctx.beginPath();
            ctx.arc(cell * 1.3, v * 0.78, cell * 0.45, 0, Math.PI * 2);
            markFill();
        }
        ctx.restore();
    }
    var width = 0;
    var height = 0;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function alienWord() {
        var count = 4 + Math.floor(Math.random() * 3);
        var word = [];
        var k;
        for (k = 0; k < count; k++) {
            word.push(Math.floor(Math.random() * 8));
        }
        return word;
    }

    var humanLines = [
        "Guten Tag",
        "Hello there",
        "Bonjour à tous",
        "Hola, ¿qué tal?",
        "Olá, tudo bem?",
        "Ciao a tutti",
        "Hallo allemaal",
        "Dzień dobry",
        "Dobrý den",
        "Dobrý deň",
        "Jó napot",
        "Bună ziua",
        "Добър ден",
        "Καλημέρα",
        "God dag",
        "God dag til deg",
        "Hej med dig",
        "Hyvää päivää",
        "Tere päevast",
        "Labdien",
        "Laba diena",
        "Dia dhuit",
        "Bore da",
        "Halò a h-uile duine",
        "Kaixo",
        "Bon dia",
        "Bos días",
        "Góðan dag",
        "Bonġu",
        "Mirëdita",
        "Добар дан",
        "Dobar dan",
        "Dobar dan svima",
        "Dober dan",
        "Добар ден",
        "Добрий день",
        "Добры дзень",
        "Добрый день",
        "Moien alleguer",
        "Bun di",
        "Sámi dearvva",
        "Hallo friezen",
        "Demat deoc'h",
        "שלום עליכם",
        "السلام عليكم",
        "سلام، روز بخیر",
        "Merhaba, nasılsın?",
        "Silav",
        "Salam, necəsən?",
        "Բարեւ ձեզ",
        "გამარჯობა",
        "Сәлем",
        "Salom",
        "Salam size",
        "Салам",
        "Салом",
        "سلام وروره",
        "السلام علیکم",
        "नमस्ते",
        "নমস্কার",
        "ਸਤ ਸ੍ਰੀ ਅਕਾਲ",
        "નમસ્તે",
        "नमस्कार",
        "வணக்கம்",
        "నమస్కారం",
        "ನಮಸ್ಕಾರ",
        "നമസ്കാരം",
        "ආයුබෝවන්",
        "नमस्ते साथी",
        "ନମସ୍କାର",
        "নমস্কাৰ",
        "سلام عليڪم",
        "آداب",
        "އައްސަލާމް ޢަލައިކުމް",
        "你好",
        "こんにちは",
        "안녕하세요",
        "Xin chào",
        "สวัสดี",
        "ສະບາຍດີ",
        "ជំរាបសួរ",
        "မင်္ဂလာပါ",
        "Selamat pagi",
        "Selamat datang",
        "Kumusta",
        "Maayong buntag",
        "Sugeng enjing",
        "Wilujeng enjing",
        "Сайн уу",
        "བཀྲ་ཤིས་བདེ་ལེགས",
        "ياخشىمۇسىز",
        "Habari yako",
        "ሰላም",
        "Sannu",
        "Bawo ni",
        "Kedu",
        "Sawubona",
        "Molo",
        "Goeie dag",
        "Salaam",
        "Akkam",
        "ሰላም ኣለኻ",
        "Muraho",
        "Mbote",
        "Nanga def",
        "Salama",
        "Mhoro",
        "Dumela",
        "Lumela",
        "Maakye",
        "Jam na",
        "I ni ce",
        "Moni",
        "Oli otya",
        "Wĩ mwega",
        "Azul",
        "Allinllachu",
        "Mba'éichapa",
        "Kamisaraki",
        "Niltze",
        "Bonjou",
        "ᐊᐃᓐᖓᐃ",
        "ᑕᓂᓯ",
        "Yá'át'ééh",
        "Mari mari",
        "Kia ora",
        "Aloha",
        "Talofa",
        "Mālō e lelei",
        "Bula",
        "Ia ora na",
        "Håfa adai",
        "Gutpela dei"
    ];
    var stories = [
        "Ein Kind fand einen Stein. Darin schlief ein kleines Licht.",
        "A child found a stone. A small light slept inside it.",
        "Un enfant trouva une pierre. Une petite lumière y dormait.",
        "Un niño halló una piedra. Dentro dormía una luz pequeña.",
        "Uma criança achou uma pedra. Dentro dormia uma luz pequena.",
        "Un bambino trovò una pietra. Dentro dormiva una piccola luce.",
        "Bir çocuk bir taş buldu. İçinde küçük bir ışık uyuyordu.",
        "وجد طفل حجرا. كان في داخله نور صغير نائم.",
        "孩子找到一块石头。里面睡着一小盏光。",
        "子どもが石を見つけた。中で小さな光が眠っていた。",
        "Ребёнок нашёл камень. Внутри спал маленький свет.",
        "एक बच्चे को पत्थर मिला। उसमें एक छोटी रोशनी सो रही थी।",
        "Mtoto alipata jiwe. Ndani yake taa ndogo ilikuwa imelala.",
        "Một đứa trẻ tìm thấy hòn đá. Bên trong một ánh sáng nhỏ đang ngủ.",
        "Seorang anak menemukan batu. Di dalamnya tidur cahaya kecil.",
        "Dziecko znalazło kamień. W środku spało małe światło.",
        "Ένα παιδί βρήκε μια πέτρα. Μέσα κοιμόταν ένα μικρό φως.",
        "아이가 돌을 찾았다. 그 안에서 작은 빛이 자고 있었다.",
        "ילד מצא אבן. בתוכה ישנה אור קטן.",
        "Ein Vogel brachte einen Samen. Am Morgen stand ein Baum da."
    ];
    var aiLines = [
        "kora ven ilath seth",
        "neth oru ka voru",
        "sel ath il sa ren",
        "va koru neth othu",
        "oren tu sel nari",
        "ilath ka ven seth ul",
        "thu nari oru ven ka",
        "seth ul koru il neth",
        "kora ven ilath. neth othu sel ath.",
        "va koru neth. il sa ren othu."
    ];
    var laneCount = 0;

    function pickText(lane) {
        if (!lane) {
            return { kind: "none", text: "" };
        }
        laneCount += 1;
        var turn = laneCount % 3;
        if (turn === 0) {
            return { kind: "alien", text: "" };
        }
        if (turn === 2) {
            return { kind: "ai", text: aiLines[Math.floor(Math.random() * aiLines.length)] };
        }
        if (Math.random() < 0.3) {
            return { kind: "human", text: stories[Math.floor(Math.random() * stories.length)] };
        }
        return { kind: "human", text: humanLines[Math.floor(Math.random() * humanLines.length)] };
    }

    function makeBit() {
        var lane = Math.random() < 0.55;
        var picked = pickText(lane);
        var text = picked.text;
        var story = text.length > 40;
        return {
            x: (Math.random() - 0.5) * 1.8,
            y: (Math.random() - 0.5) * 1.15,
            z: 0.15 + Math.random() * 1.5,
            w: lane ? (story ? 0.34 : 0.16) + Math.random() * 0.04 : 0.015 + Math.random() * 0.03,
            h: lane ? (story ? 0.16 : 0.06) + Math.random() * 0.02 : 0.04 + Math.random() * 0.1,
            lane: lane,
            word: alienWord(),
            kind: picked.kind,
            human: text
        };
    }

    var bits = [];
    var i;
    for (i = 0; i < 70; i++) {
        bits.push(makeBit());
    }

    var columns = [];
    var digitKeys = "0123456789ABCDEFGILMNOPRSTUY=$%";

    var bitRuns = ["000000000", "111111", "010000111001110011", "000000000", "111111"];

    function pushRun(glyphs, text, limit) {
        var i;
        for (i = 0; i < text.length && glyphs.length < limit; i++) {
            var ch = text.charAt(i);
            if (ch !== " " && Math.random() < 0.1) {
                glyphs.push("*" + Math.floor(Math.random() * 8));
            } else {
                glyphs.push(font[ch] ? ch : " ");
            }
        }
    }

    function spawnColumn(x) {
        var len = 42 + Math.floor(Math.random() * 12);
        var glyphs = [];
        while (glyphs.length < len) {
            if (Math.random() < 0.7) {
                pushRun(glyphs, code[Math.floor(Math.random() * code.length)], len);
            } else {
                pushRun(glyphs, bitRuns[Math.floor(Math.random() * bitRuns.length)], len);
            }
        }
        return {
            x: x,
            y: Math.random() * height,
            speed: 28 + Math.random() * 42,
            glyphs: glyphs
        };
    }

    function layoutMatrix() {
        columns = [];
        var gap = 18;
        var x;
        for (x = width * 0.46; x < width - 8; x += gap) {
            columns.push(spawnColumn(x));
        }
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        var ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        layoutMatrix();
    }

    function project(x, y, z, vpX, vpY) {
        var s = 0.9 / Math.max(z, 0.08);
        return {
            x: vpX + x * s * width * 0.42,
            y: vpY + y * s * height * 0.42
        };
    }

    function frame(now) {
        var vpX = width * 0.62;
        var vpY = height * 0.38;
        var speed = reduced ? 0 : 0.00055;
        ctx.clearRect(0, 0, width, height);

        var glow = ctx.createRadialGradient(vpX, vpY, 0, vpX, vpY, Math.min(width, height) * 0.22);
        glow.addColorStop(0, "rgba(" + green + ",0.55)");
        glow.addColorStop(0.18, "rgba(" + green + ",0.12)");
        glow.addColorStop(1, "rgba(" + green + ",0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);

        var n;
        for (n = bits.length - 1; n >= 0; n--) {
            var bit = bits[n];
            bit.z -= speed * (0.35 + bit.z);
            if (bit.z < 0.08) {
                bit.z = 1.35 + Math.random() * 0.4;
                bit.x = (Math.random() - 0.5) * 1.8;
                bit.y = (Math.random() - 0.5) * 1.15;
                bit.word = alienWord();
                var picked = pickText(bit.lane);
                bit.kind = picked.kind;
                bit.human = picked.text;
                if (bit.human.length > 40) {
                    bit.w = 0.34 + Math.random() * 0.04;
                    bit.h = 0.16 + Math.random() * 0.02;
                } else if (bit.human) {
                    bit.w = 0.16 + Math.random() * 0.03;
                    bit.h = 0.06 + Math.random() * 0.015;
                }
            }
            var far = project(bit.x, bit.y, bit.z + 0.18, vpX, vpY);
            var near = project(bit.x, bit.y, bit.z, vpX, vpY);
            var depth = Math.max(0, Math.min(1, (1.2 - bit.z) / 1.1));
            var alpha = depth * 0.55;
            ctx.strokeStyle = "rgba(" + green + "," + alpha.toFixed(3) + ")";
            ctx.lineWidth = 0.6 + depth * 1.4;
            ctx.beginPath();
            ctx.moveTo(far.x, far.y);
            ctx.lineTo(near.x, near.y);
            ctx.stroke();

            if (bit.lane) {
                var top = project(bit.x, bit.y - bit.h, bit.z, vpX, vpY);
                var side = project(bit.x + bit.w, bit.y, bit.z, vpX, vpY);
                var farX = side.x + (top.x - near.x);
                var farY = side.y + (top.y - near.y);
                ctx.globalAlpha = Math.max(alpha, 0.75);
                ctx.fillStyle = "rgba(2, 8, 12, 0.88)";
                ctx.beginPath();
                ctx.moveTo(near.x, near.y);
                ctx.lineTo(top.x, top.y);
                ctx.lineTo(farX, farY);
                ctx.lineTo(side.x, side.y);
                ctx.closePath();
                ctx.fill();
                var boxL = Math.min(near.x, top.x, side.x, farX);
                var boxT = Math.min(near.y, top.y, side.y, farY);
                var boxW = Math.max(near.x, top.x, side.x, farX) - boxL;
                var boxH = Math.max(near.y, top.y, side.y, farY) - boxT;
                var word = bit.word || [0, 1, 2, 3];
                if (bit.human && boxW > 16 && boxH > 12) {
                    var viewL = Math.max(boxL, 12);
                    var viewR = Math.min(boxL + boxW, width - 12);
                    var viewT = Math.max(boxT, 12);
                    var viewB = Math.min(boxT + boxH, height - 12);
                    var story = bit.human.length > 40;
                    var maxW = Math.max(48, viewR - viewL - 8);
                    if (story) {
                        maxW = Math.min(maxW, 520);
                    }
                    var maxH = Math.max(16, viewB - viewT - 8);
                    var fontFace = "'Segoe UI', 'Nirmala UI', 'Leelawadee UI', 'Malgun Gothic', 'Microsoft YaHei', 'Yu Gothic', 'Ebrima', 'Myanmar Text', Arial, sans-serif";
                    function wrapLines(px) {
                        ctx.font = px + "px " + fontFace;
                        var out = [];
                        var rest = bit.human;
                        var guard = 0;
                        while (rest && guard < 12) {
                            guard += 1;
                            var fit = rest;
                            while (fit.length > 1 && ctx.measureText(fit).width > maxW) {
                                var cut = fit.lastIndexOf(" ");
                                if (cut < 1) {
                                    cut = Math.max(1, fit.length - 1);
                                }
                                fit = fit.slice(0, cut);
                            }
                            out.push(fit);
                            rest = rest.slice(fit.length).replace(/^\s+/, "");
                        }
                        return out;
                    }
                    var size = story ? Math.min(28, Math.floor(maxH / 2.2)) : Math.min(20, Math.floor(maxH / 1.5));
                    var lines = wrapLines(size);
                    var floor = story ? 20 : 15;
                    while (size > floor && lines.length * size * 1.15 > maxH) {
                        size -= 1;
                        lines = wrapLines(size);
                    }
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(near.x, near.y);
                    ctx.lineTo(top.x, top.y);
                    ctx.lineTo(farX, farY);
                    ctx.lineTo(side.x, side.y);
                    ctx.closePath();
                    ctx.clip();
                    ctx.beginPath();
                    ctx.rect(viewL, viewT, Math.max(0, viewR - viewL), Math.max(0, viewB - viewT));
                    ctx.clip();
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = "rgb(72, 76, 82)";
                    ctx.strokeStyle = "rgb(72, 76, 82)";
                    ctx.lineWidth = 0.7;
                    ctx.font = size + "px " + fontFace;
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    var lineH = size * 1.2;
                    var blockH = lines.length * lineH;
                    var cx = (viewL + viewR) / 2;
                    var cy = (viewT + viewB) / 2;
                    var ly;
                    for (ly = 0; ly < lines.length; ly++) {
                        var ty = cy - blockH / 2 + ly * lineH + lineH / 2;
                        ctx.strokeText(lines[ly], cx, ty);
                        ctx.fillText(lines[ly], cx, ty);
                    }
                    ctx.restore();
                } else if (bit.kind === "alien" && boxW > 28 && boxH > 14) {
                    var cell = Math.min((boxW - 8) / (word.length * 5.3), (boxH - 6) / 7.4);
                    if (cell > 0.7) {
                        var rowW = word.length * cell * 5.3;
                        var gx = boxL + (boxW - rowW) / 2;
                        var gy = boxT + (boxH - cell * 7) / 2;
                        var gi;
                        ctx.globalAlpha = 1;
                        for (gi = 0; gi < word.length; gi++) {
                            drawAlien(word[gi], gx + gi * cell * 5.3, gy, cell, true, "rgb(72, 76, 82)");
                        }
                    }
                }
                ctx.globalAlpha = 1;
            }
        }

        var drift = reduced ? 0 : (now / 1000) * 18;
        var leftStep = 18;
        var leftBlock = algo.length * leftStep;
        var shift = drift % leftBlock;
        var copies = Math.ceil(height / leftBlock) + 1;
        ctx.font = "13px Consolas, 'Courier New', monospace";
        ctx.textBaseline = "top";
        var copy;
        var left;
        for (copy = 0; copy < copies; copy++) {
            for (left = 0; left < algo.length; left++) {
                var ly = copy * leftBlock + left * leftStep - shift;
                if (ly < -leftStep || ly > height) {
                    continue;
                }
                var fadeLeft = 0.28 + 0.18 * (0.5 + 0.5 * Math.sin(ly / 70));
                ctx.fillStyle = "rgba(" + green + "," + fadeLeft.toFixed(3) + ")";
                ctx.fillText(algo[left], 18, ly);
            }
        }

        var cell = 1.55;
        var step = cell * 7 + 3;
        var col;
        var gi;
        for (col = 0; col < columns.length; col++) {
            var stream = columns[col];
            if (!reduced) {
                stream.y += stream.speed * 0.016;
            }
            if (stream.y - stream.glyphs.length * step > height) {
                columns[col] = spawnColumn(stream.x);
                columns[col].y = -step * 4;
                stream = columns[col];
            }
            for (gi = 0; gi < stream.glyphs.length; gi++) {
                var gy = stream.y - gi * step;
                if (gy < -step || gy > height) {
                    continue;
                }
                var head = gi === 0 ? 0.9 : Math.max(0.08, 0.42 * (1 - gi / stream.glyphs.length));
                var token = stream.glyphs[gi];
                ctx.fillStyle = "rgba(" + green + "," + head.toFixed(3) + ")";
                if (token.charAt(0) === "*") {
                    drawAlien(parseInt(token.charAt(1), 10), stream.x, gy, cell);
                } else {
                    drawDigital(token, stream.x, gy, cell);
                }
            }
        }

        if (!reduced) {
            requestAnimationFrame(frame);
        }
    }

    resize();
    window.addEventListener("resize", resize);
    requestAnimationFrame(frame);
})();
