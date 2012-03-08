(function() {
  var widget_state;
  widget_state = {
    current_input: "",
    suggestion_list: [],
    selected_suggestion: 0,
    added_items: []
  };
  window.sm = new W.SimpleStateMachine({
    "delete": ['empty'],
    empty: ['writing', 'delete'],
    writing: ['writing', 'empty', 'suggest', 'navigation', 'add'],
    suggest: ['writing'],
    add: ['empty'],
    navigation: ['up', 'down', 'select', 'writing'],
    up: ['navigation'],
    down: ['navigation'],
    select: ['add']
  });
  sm.transitions({
    empty: {
      "delete": 'delete',
      new_input: 'writing'
    },
    writing: {
      reset: 'empty',
      new_input: 'writing',
      "delete": 'writing',
      godown: 'navigation',
      add: 'add'
    },
    navigation: {
      goup: 'up',
      godown: 'down',
      select: 'select',
      new_input: 'writing',
      exit: 'writing'
    }
  });
  sm.set_context(widget_state);
  sm.states = {
    "delete": function() {
      var d;
      d = this.added_items.pop();
      sm.dom.manipulation.remove_last_item();
      return this.sm.go.empty();
    },
    empty: function(e) {
      sm.dom.input.val('');
      sm.dom.manipulation.hide_suggestion_box();
      return this.current_input = '';
    },
    writing: function(e, text) {
      var matching_suggestions;
      if (text === "") {
        return this.sm.go.empty();
      }
      if ((text != null) && this.current_input !== text) {
        this.current_input = text;
        matching_suggestions = _.filter(this.suggestion_list, function(s) {
          return s.match(text);
        });
        return this.sm.go.suggest(matching_suggestions);
      }
    },
    suggest: function(suggestions) {
      if (suggestions.length > 0) {
        this.active_suggestions = suggestions;
        sm.dom.manipulation.show_suggestion_box(suggestions);
      } else {
        sm.dom.manipulation.hide_suggestion_box();
        this.active_suggestions = [];
      }
      return this.sm.go.writing();
    },
    add: function(item) {
      if ((item || (item = this.current_input)) && item !== "") {
        this.added_items.push(item);
        sm.dom.manipulation.add_item(item);
      }
      return this.sm.go.empty();
    },
    navigation: function() {
      if (this.active_suggestions.length === 0) {
        this.sm.go.writing();
      }
      if (this.selected_suggestion < 0) {
        this.selected_suggestion = 0;
        sm.dom.manipulation.hide_suggestion_box();
        this.sm.send('exit');
      }
      return sm.dom.manipulation.highlight_suggestion(this.selected_suggestion + 1);
    },
    up: function() {
      this.selected_suggestion -= 1;
      return this.sm.go.navigation();
    },
    down: function() {
      this.selected_suggestion += 1;
      return this.sm.go.navigation();
    },
    select: function(item) {
      console.log("select: " + item);
      item || (item = this.active_suggestions[this.selected_suggestion]);
      return this.sm.go.add(item);
    }
  };
  sm.actions = {
    remove_item: function(text) {
      return sm.context.added_items = _.without(sm.context.added_items, text);
    }
  };
  sm.bindings = function() {
    return sm.dom.input.keyup(function(e) {
      var value;
      value = sm.dom.input.val();
      switch (e.keyCode) {
        case 40:
          return sm.send('godown');
        case 38:
          return sm.send('goup');
        case 32:
        case 188:
          return sm.send('add');
        case 13:
          return sm.send('select');
        case 8:
          return sm.send('delete', e, value);
        case 27:
          return sm.send('exit');
        default:
          return sm.send('new_input', e, value);
      }
    });
  };
  sm.dom = {
    input: null,
    added_items: null,
    suggestion_box: null,
    initialize: function() {
      sm.dom.input = $('#demo-input');
      sm.dom.added_items = $('#added-items');
      return sm.dom.suggestion_box = $('#suggestion-box');
    },
    manipulation: {
      add_item: function(text) {
        var item;
        item = $(sm.templates.item).prepend(text);
        item.find('a').click(function() {
          sm.actions.remove_item(text);
          return item.remove();
        });
        return sm.dom.added_items.append(item);
      },
      remove_last_item: function() {
        return sm.dom.added_items.find('li:last-child').remove();
      },
      show_suggestion_box: function(suggestion_list) {
        var items;
        items = _.map(suggestion_list, function(sug) {
          return $(sm.templates.sug_item).text(sug).click(function() {
            return sm.send('add', sug);
          }).css('cursor', 'pointer');
        });
        sm.dom.suggestion_box.html('');
        _.each(items, function(i) {
          return sm.dom.suggestion_box.append(i);
        });
        return sm.dom.suggestion_box.slideDown();
      },
      hide_suggestion_box: function() {
        return sm.dom.suggestion_box.slideUp();
      },
      highlight_suggestion: function(position) {
        sm.dom.suggestion_box.find("li").css('color', 'black');
        return sm.dom.suggestion_box.find("li:nth-child(" + position + ")").css('color', 'red');
      },
      close_suggestion_box: function() {
        return sm.dom.suggestion_box.slideUp();
      }
    }
  };
  sm.templates = {
    item: '<li class="item"><a href="#">x</a></li>',
    sug_box: '<div class="suggestion-box"><ul></ul></div>',
    sug_item: '<li class="sug-item"></li>'
  };
  $(function() {
    sm.dom.initialize();
    sm.bindings();
    sm.context.suggestion_list = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"];
    return sm.start('empty');
  });
}).call(this);
