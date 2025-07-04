/**
File: scrabble.js
GUI Assignment:  Homework 5
Sarah Toth, UML C.S., Sarah_Toth@student.uml.edu
Copyright (c) 2025 by Sarah.  All rights reserved.
Updated by ST on July 4, 2025 at 4:15 AM
**/

$(function () {
  const rackSize = 7;                // Max number of tiles in player's rack
  let totalScore = 0;                // Total accumulated score across rounds
  let dictionarySet = new Set();     // Set of valid words loaded from dictionary

  // Disable submit button initially until dictionary is loaded
  $('#submit-word').prop('disabled', true);

  // Load word dictionary from 'words.txt' and initialize game
  async function loadDictionary() {
    try {
      const response = await fetch('../words.txt');
      const text = await response.text();
      dictionarySet = new Set(text.split(/\r?\n/).map(w => w.trim()).filter(Boolean));
      $('#submit-word').prop('disabled', false); // Enable submit after loading
      initTiles();        // Initialize starting rack of tiles
      initDroppables();   // Setup droppable slots on board
    } catch (error) {
      console.error('Failed to load dictionary:', error);
    }
  }

  loadDictionary();

  /**
   * Generates a rack of tiles with a buildable word and fills the rest with random tiles
   * @param {number} num - number of tiles to generate
   * @returns {string[]} array of letters forming the rack
   */
  function getRandomTiles(num) {
    const rack = [];
    const letters = Object.keys(ScrabbleTiles);
    const validWords = [...dictionarySet].filter(w => w.length <= num);

    let chosenWord = '';
    let maxTries = 1000;

    // Attempt to find a valid word that can be built with available tiles
    while (maxTries-- > 0) {
      const word = validWords[Math.floor(Math.random() * validWords.length)];
      const letterCounts = {};
      let canBuild = true;

      for (let ch of word) {
        if (!ScrabbleTiles[ch]) {
          canBuild = false;
          break;
        }
        letterCounts[ch] = (letterCounts[ch] || 0) + 1;
        if (letterCounts[ch] > ScrabbleTiles[ch]["number-remaining"]) {
          canBuild = false;
          break;
        }
      }

      if (canBuild) {
        chosenWord = word;
        break;
      }
    }

    // Deduct tiles used for the chosen word from inventory and add to rack
    if (chosenWord) {
      for (let ch of chosenWord) {
        ScrabbleTiles[ch]["number-remaining"]--;
        rack.push(ch);
      }
    }

    // Fill the rest of the rack with random available tiles
    while (rack.length < num) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      if (ScrabbleTiles[letter]["number-remaining"] > 0) {
        ScrabbleTiles[letter]["number-remaining"]--;
        rack.push(letter);
      }
    }

    // Shuffle the rack letters randomly
    for (let i = rack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rack[i], rack[j]] = [rack[j], rack[i]];
    }

    return rack;
  }

  /**
   * Initialize the tile rack with a full new set of tiles
   */
  function initTiles() {
    $("#tile-rack").empty();
    const rack = getRandomTiles(rackSize);
    rack.forEach(letter => addTileToRack(letter));
  }

  /**
   * Add only missing tiles to the rack (after a valid word submission)
   */
  function refillMissingTiles() {
    const currentCount = $('#tile-rack .tile').length;
    const tilesToAdd = rackSize - currentCount;

    if (tilesToAdd <= 0) return;

    const newTiles = getRandomTiles(tilesToAdd);
    newTiles.forEach(letter => addTileToRack(letter));
  }

  /**
   * Helper to create a draggable tile image element and add it to rack
   * @param {string} letter - The letter for the tile
   */
  function addTileToRack(letter) {
    const tile = $('<img>')
      .addClass('tile')
      .attr('src', `images/tiles/${letter}.jpg`)
      .attr('data-letter', letter)
      .attr('data-value', ScrabbleTiles[letter].value)
      .draggable({
        // Logic for reverting invalid drops (enforces contiguous placement)
        revert: function (dropped) {
          if (!dropped || $(dropped).children('img.tile').length > 0) return true;
          const droppedIndex = $('.drop-slot').index(dropped);
          const occupiedIndices = [];

          $('.drop-slot').each(function (idx) {
            if ($(this).children('img.tile').length > 0) {
              occupiedIndices.push(idx);
            }
          });

          if (occupiedIndices.length === 0) return droppedIndex !== 0;

          const minIndex = Math.min(...occupiedIndices);
          if (droppedIndex < minIndex) return true;

          occupiedIndices.push(droppedIndex);
          occupiedIndices.sort((a, b) => a - b);
          const maxIndex = occupiedIndices[occupiedIndices.length - 1];

          return maxIndex - minIndex + 1 !== occupiedIndices.length;
        }
      });

    $('#tile-rack').append(tile);
  }

  /**
   * Setup droppable behavior on board slots
   */
  function initDroppables() {
    $('.drop-slot').droppable({
      accept: '.tile',
      drop: function (event, ui) {
        const $tile = ui.helper;
        const $slot = $(this);
        const droppedIndex = $('.drop-slot').index($slot);

        if ($slot.children().length > 0) return; // Prevent multiple tiles in one slot

        // Handle wildcard blank tile: prompt user for letter choice
        const letter = $tile.attr('data-letter');
        if (letter === "_") {
          let chosen = prompt("Enter the letter this blank tile represents:").toUpperCase();
          if (!/^[A-Z]$/.test(chosen)) return;
          $tile.attr('data-letter', chosen);
          $tile.attr('src', `images/tiles/${chosen}.jpg`);
        }

        // Check contiguous placement rules
        const occupiedIndices = [];
        $('.drop-slot').each(function (idx) {
          if ($(this).children('img.tile').length > 0) {
            occupiedIndices.push(idx);
          }
        });

        if (occupiedIndices.length === 0 && droppedIndex !== 0) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        const minIndex = Math.min(...occupiedIndices);
        if (occupiedIndices.length > 0 && droppedIndex < minIndex) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        occupiedIndices.push(droppedIndex);
        occupiedIndices.sort((a, b) => a - b);
        const maxIndex = occupiedIndices[occupiedIndices.length - 1];
        const expectedLength = maxIndex - Math.min(...occupiedIndices) + 1;

        if (expectedLength !== occupiedIndices.length) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        // Accept drop: move tile into slot and disable dragging
        $tile.detach().css({ top: 0, left: 0 }).appendTo($slot);
        $tile.draggable('disable');

        // Enable submit button since tiles are on the board
        $('#submit-word').prop('disabled', false);
        updateCurrentScoreDisplay();
      }
    });
  }

  /**
   * Calculate the score for the current placed word on the board,
   * considering letter and word bonuses
   * @returns {number} calculated score
   */
  function calculateScore() {
    let total = 0;
    let multiplier = 1;

    $('.drop-slot').each(function () {
      const $tile = $(this).find('img');
      if ($tile.length === 0) return;

      let value = parseInt($tile.attr('data-value'));
      const bonus = $(this).data('bonus');

      if (bonus === 'double-letter') value *= 2;
      if (bonus === 'double-word') multiplier *= 2;

      total += value;
    });

    return total * multiplier;
  }

  /**
   * Update the displayed score, showing current word score and total score
   */
  function updateCurrentScoreDisplay() {
    const currentScore = calculateScore();
    $('#score').text(`Current Word Score: ${currentScore} (Total: ${totalScore})`);
  }

  /**
   * Reads the word formed on the board by concatenating placed tile letters
   * @returns {string} formed word
   */
  function getSubmittedWord() {
    let word = '';
    $('.drop-slot').each(function () {
      const $tile = $(this).find('img');
      if ($tile.length) word += $tile.attr('data-letter');
    });
    return word;
  }

  /**
   * Clears the board tiles and resets submit button and score display
   */
  function clearBoard() {
    $('.drop-slot').empty();
    $('#submit-word').prop('disabled', true);
    $('#score').text(`Score: ${totalScore}`);
  }

  /**
   * Resets the rack and board, returning used tiles to the pool,
   * then initializes a full new rack
   */
  function resetRack() {
    $('#tile-rack, .drop-slot').find('img.tile').each(function () {
      const letter = $(this).attr('data-letter');
      ScrabbleTiles[letter]["number-remaining"]++;
      $(this).remove();
    });

    initTiles();
  }

  /**
   * Checks if a word is valid by looking it up in the dictionary set
   * @param {string} word - word to validate
   * @returns {boolean} true if valid
   */
  function validateWord(word) {
    return dictionarySet.has(word.toUpperCase());
  }

  // Handler for Submit Word button click
  $('#submit-word').click(function () {
    const word = getSubmittedWord();

    if (word.length === 0) {
      $('#message').text('Place at least one tile.').css('color', 'orange');
      return;
    }

    const isValid = validateWord(word);

    if (isValid) {
      const score = calculateScore();
      totalScore += score;
      $('#message').text(`✔ "${word}" is valid! +${score} points`).css('color', 'green');

      // Clear board and refill only missing rack tiles
      clearBoard();
      updateCurrentScoreDisplay();
      refillMissingTiles();
      initDroppables();

    } else {
      $('#message').text(`✖ "${word}" is not valid. Try again.`).css('color', 'red');

      // Clear board and reset full rack if word invalid
      clearBoard();
      resetRack();
    }
  });

  // Handler for New Game button click: resets everything
  $('#new-game').click(function () {
    totalScore = 0;
    resetRack();
    clearBoard();
    $('#message').text('');
    $('#score').text('Score: 0');
  });
});
