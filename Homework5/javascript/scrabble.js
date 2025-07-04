/**
File: scrabble.js
GUI Assignment:  Homework 5
Sarah Toth, UML C.S., Sarah_Toth@student.uml.edu
Copyright (c) 2025 by Sarah.  All rights reserved.
Updated by ST on July 4, 2025 at 6:05 AM
**/

// When the DOM is ready, execute everything inside this function
$(function () {
  const rackSize = 7; // Number of tiles in the player's rack
  let totalScore = 0; // Tracks the player's total score
  let dictionarySet = new Set(); // Set to hold valid words for quick lookup

  // Disable submit button initially until dictionary is loaded
  $('#submit-word').prop('disabled', true);

  // Load the dictionary from the predefined dictionaryWords array
  function loadDictionary() {
    if (Array.isArray(dictionaryWords)) {
      dictionarySet = new Set(dictionaryWords);
      $('#submit-word').prop('disabled', false); // Enable submit once dictionary is ready
      initTiles();         // Generate initial tiles for the rack
      initDroppables();    // Make board slots accept tile drops
    } else {
      console.error('dictionaryWords not found or not an array.');
    }
  }

  loadDictionary(); // Initialize dictionary and game state

  // Generate a rack of tiles that can form at least one valid word
  function getRandomTiles(num) {
    const rack = [];
    const letters = Object.keys(ScrabbleTiles);
    const validWords = [...dictionarySet].filter(w => w.length <= num);

    let chosenWord = '';
    let maxTries = 1000;

    // Try to find a word that can be constructed from remaining tiles
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

    // Add chosen word's letters to rack
    if (chosenWord) {
      for (let ch of chosenWord) {
        ScrabbleTiles[ch]["number-remaining"]--;
        rack.push(ch);
      }
    }

    // Fill remaining rack spots with random valid tiles
    while (rack.length < num) {
      const letter = letters[Math.floor(Math.random() * letters.length)];
      if (ScrabbleTiles[letter]["number-remaining"] > 0) {
        ScrabbleTiles[letter]["number-remaining"]--;
        rack.push(letter);
      }
    }

    // Shuffle rack
    for (let i = rack.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rack[i], rack[j]] = [rack[j], rack[i]];
    }

    return rack;
  }

  // Initialize the tile rack with draggable tiles
  function initTiles() {
    $("#tile-rack").empty();
    const rack = getRandomTiles(rackSize);

    rack.forEach(letter => {
      const tile = $('<img>')
        .addClass('tile')
        .attr('src', `images/tiles/${letter}.jpg`)
        .attr('data-letter', letter)
        .attr('data-value', ScrabbleTiles[letter].value)
        .draggable({
          // Tile can revert based on board rules
          revert: function (dropped) {
            if (!dropped || $(dropped).children('img.tile').length > 0) return true;

            const droppedIndex = $('.drop-slot').index(dropped);
            const occupiedIndices = [];

            $('.drop-slot').each(function (idx) {
              if ($(this).children('img.tile').length > 0) {
                occupiedIndices.push(idx);
              }
            });

            // Ensure first tile is in first slot
            if (occupiedIndices.length === 0) return droppedIndex !== 0;

            const minIndex = Math.min(...occupiedIndices);
            if (droppedIndex < minIndex) return true;

            occupiedIndices.push(droppedIndex);
            occupiedIndices.sort((a, b) => a - b);
            const maxIndex = occupiedIndices[occupiedIndices.length - 1];

            // Ensure tiles are contiguous
            return maxIndex - minIndex + 1 !== occupiedIndices.length;
          }
        });

      $('#tile-rack').append(tile);
    });
  }

  // Make board slots droppable and handle tile placement rules
  function initDroppables() {
    $('.drop-slot').droppable({
      accept: '.tile',
      drop: function (event, ui) {
        const $tile = ui.helper;
        const $slot = $(this);
        const droppedIndex = $('.drop-slot').index($slot);

        // Prevent overwriting already occupied slots
        if ($slot.children().length > 0) return;

        // Handle blank tile replacement
        const letter = $tile.attr('data-letter');
        if (letter === "_") {
          let chosen = prompt("Enter the letter this blank tile represents:").toUpperCase();
          if (!/^[A-Z]$/.test(chosen)) return;
          $tile.attr('data-letter', chosen);
          $tile.attr('src', `images/tiles/${chosen}.jpg`);
        }

        const occupiedIndices = [];
        $('.drop-slot').each(function (idx) {
          if ($(this).children('img.tile').length > 0) {
            occupiedIndices.push(idx);
          }
        });

        // Enforce first tile must be placed in first slot
        if (occupiedIndices.length === 0 && droppedIndex !== 0) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        const minIndex = Math.min(...occupiedIndices);
        if (occupiedIndices.length > 0 && droppedIndex < minIndex) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        // Enforce contiguity
        occupiedIndices.push(droppedIndex);
        occupiedIndices.sort((a, b) => a - b);
        const maxIndex = occupiedIndices[occupiedIndices.length - 1];
        const expectedLength = maxIndex - Math.min(...occupiedIndices) + 1;

        if (expectedLength !== occupiedIndices.length) {
          $tile.draggable('option', 'revert', true);
          return;
        }

        // Accept the drop
        $tile.detach().css({ top: 0, left: 0 }).appendTo($slot);
        $tile.draggable('disable');
        $('#submit-word').prop('disabled', false);
        updateCurrentScoreDisplay();
      }
    });
  }

  // Compute score based on placed tiles and bonuses
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

  // Update the score display UI
  function updateCurrentScoreDisplay() {
    const currentScore = calculateScore();
    $('#score').text(`Current Word Score: ${currentScore} (Total: ${totalScore})`);
  }

  // Construct the word formed by tiles on the board
  function getSubmittedWord() {
    let word = '';
    $('.drop-slot').each(function () {
      const $tile = $(this).find('img');
      if ($tile.length) word += $tile.attr('data-letter');
    });
    return word;
  }

  // Clear the board slots and update UI
  function clearBoard() {
    $('.drop-slot').empty();
    $('#submit-word').prop('disabled', true);
    $('#score').text(`Score: ${totalScore}`);
  }

  // Reset the rack, restoring used tiles and refilling
  function resetRack() {
    $('#tile-rack, .drop-slot').find('img.tile').each(function () {
      const letter = $(this).attr('data-letter');
      ScrabbleTiles[letter]["number-remaining"]++;
      $(this).remove();
    });

    initTiles();
  }

  // Check if the submitted word is valid
  function validateWord(word) {
    return dictionarySet.has(word.toUpperCase());
  }

  // Handle submit button click: validate word, update score, refresh board
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
      clearBoard();
      updateCurrentScoreDisplay();
      initTiles();         // Refill rack
      initDroppables();    // Re-initialize board slots
    } else {
      $('#message').text(`✖ "${word}" is not valid. Try again.`).css('color', 'red');
      clearBoard();
      resetRack(); // Return tiles to rack if word is invalid
    }
  });

  // Handle "New Game" button: reset everything
  $('#new-game').click(function () {
    totalScore = 0;
    resetRack();     // Get new tiles
    clearBoard();    // Clear board
    $('#message').text('');
    $('#score').text('Score: 0');
  });
});
