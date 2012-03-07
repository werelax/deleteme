(function() {
  var sm, widget_state;
  widget_state = {
    current_input: "",
    suggestion_list: [],
    selected_suggestion: 0,
    added_items: []
  };
  sm = new W.SimpleStateMachine({
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
      console.log("Deleting " + d + "...");
      return this.sm.go.empty();
    },
    empty: function() {
      sm.dom.input.val('');
      this.current_input = '';
      return console.log('empty I am!');
    },
    writing: function(e, text) {
      if (text === "") {
        return this.sm.go.empty();
      }
      console.log("writing: " + text);
      return this.current_input = text;
    },
    suggest: function() {
      console.log("suggesting on: " + text);
      return this.sm.go.writing();
    },
    add: function() {
      var item;
      if ((item = this.current_input) && item !== "") {
        this.added_items.push(item);
        console.log("NEW ITEM [" + this.current_input + "]");
        console.log("  - item list: " + this.added_items);
      }
      return this.sm.go.empty();
    },
    navigation: function() {
      if (this.selected_suggestion < 0) {
        console.log('Quit navigation');
        this.selected_suggestion = 0;
        this.sm.send('exit');
      }
      console.log("Enterin navigation state");
      return console.log("  - current selection: " + this.selected_suggestion);
    },
    up: function() {
      console.log("Going up in navigation!");
      this.selected_suggestion -= 1;
      return this.sm.go.navigation();
    },
    down: function() {
      console.log("Going down in navigation!");
      this.selected_suggestion += 1;
      return this.sm.go.navigation();
    },
    select: function() {
      console.log("item selected: " + this.selected_suggestion);
      this.current_input = this.suggestion_list[this.selected_suggestion];
      return this.sm.go.add();
    }
  };
  sm.actions = {
    remove_item: function(text) {
      return sm.context.added_items = _.without(sm.context.added_items, text);
    }
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
      add_item: function(text, id) {
        var item;
        item = $(sm.templates.item).prepend(text);
        return item.find('a').click(function() {
          sm.actions.remove_item(text);
          return item.remove();
        });
      },
      show_suggestion_box: function(suggestion_list) {
        var items;
        items = _.map(suggestion_list, function(sug) {
          return $(sm.templates.sug_item).text(sug);
        });
        return sm.dom.suggestion_box.append(items).slideDown();
      },
      highlight_suggestion: function(position) {},
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
  $(function() {
    sm.dom.initialize();
    sm.bindings();
    return sm.start('empty');
  });
}).call(this);
