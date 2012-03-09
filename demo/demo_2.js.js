(function() {
  var Channel, TagAcumulator, TagInput, TagSuggestion, TagWidget;
  var __slice = Array.prototype.slice, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  Channel = (function() {
    Channel.prototype.subscribe = function(type, fn, ctx) {
      var _base;
      (_base = this.events)[type] || (_base[type] = []);
      return this.events[type].push({
        context: ctx,
        callback: fn || this
      });
    };
    Channel.prototype.unsubscribe = function(chn, fn) {};
    Channel.prototype.publish = function() {
      var args, subscriber, type, _i, _len, _ref, _results;
      type = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!this.events[type]) {
        return false;
      }
      _ref = this.events[type];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        subscriber = _ref[_i];
        _results.push(subscriber.callback.apply(subscriber.context, args));
      }
      return _results;
    };
    function Channel() {
      this.events = {};
    }
    return Channel;
  })();
  TagAcumulator = (function() {
    function TagAcumulator(ch, options) {
      if (options == null) {
        options = {};
      }
      this.channel = ch;
      this.channel.subscribe('accumulator:store', this.store, this);
      this.channel.subscribe('accumulator:delete-last', this.delete_last, this);
      this.stored_tags = [];
      if (options.tag_render != null) {
        this.render = options.tag_render;
      }
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagAcumulator.prototype.store = function(tag) {
      if (__indexOf.call(this.stored_tags, tag) < 0) {
        this.stored_tags.push(tag);
        return this.dom.tag_list.find('li:last').before(this.render(tag));
      }
    };
    TagAcumulator.prototype.delete_last = function() {
      var deleted;
      deleted = this.stored_tags.pop();
      return this.dom.tag_list.find("[data-tag=" + deleted + "]").remove();
    };
    TagAcumulator.prototype.delete_tag = function(tag) {
      return this.stored_tags = _.without(this.stored_tags, tag);
    };
    TagAcumulator.prototype.initialize_dom = function() {
      return {
        tag_list: $('.e-tgwd-list-store')
      };
    };
    TagAcumulator.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.tag_list.delegate('li.e-tag > a', 'click', function(e) {
        var tag_element;
        tag_element = $(this).closest('li.e-tag');
        self.delete_tag(tag_element.attr('data-tag'));
        return tag_element.remove();
      });
    };
    TagAcumulator.prototype.render = function(tag) {
      return $('<li/>').addClass('e-tag').attr('data-tag', tag).text(tag).append('<a href="#">x</a>');
    };
    return TagAcumulator;
  })();
  TagSuggestion = (function() {
    function TagSuggestion(ch, options) {
      if (options == null) {
        options = {};
      }
      this.channel = ch;
      this.channel.subscribe('suggest:show', this.show, this);
      this.channel.subscribe('suggest:close', this.close, this);
      this.channel.subscribe('suggest:next', this.go_next, this);
      this.channel.subscribe('suggest:prev', this.go_prev, this);
      this.channel.subscribe('suggest:select', this.select, this);
      this.input = "";
      this.selected_index = 0;
      this.options_list = [];
      if (options.get_suggestions != null) {
        this.get_suggestions = options.get_suggestions;
      }
      this.available_values = options.suggestions || [];
      if (options.suggest_render != null) {
        this.render = options.suggest_render;
      }
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagSuggestion.prototype.get_suggestions = function(input, cb) {
      var list;
      list = _.filter(this.available_values, function(w) {
        return w.match(input);
      });
      return cb(list);
    };
    TagSuggestion.prototype.go_next = function() {
      this.selected_index = Math.min(this.options_list.length - 1, this.selected_index + 1);
      return this.highlight_element();
    };
    TagSuggestion.prototype.go_prev = function() {
      this.selected_index = Math.max(0, this.selected_index - 1);
      return this.highlight_element();
    };
    TagSuggestion.prototype.select = function(selected) {
      selected || (selected = this.options_list[this.selected_index]);
      this.channel.publish('suggest:selected', selected);
      return this.close();
    };
    TagSuggestion.prototype.initialize_dom = function() {
      return {
        suggestion_box: $('.e-tgwd-suggest-box')
      };
    };
    TagSuggestion.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.suggestion_box.delegate('li.e-suggestion', 'click', function() {
        var suggestion;
        suggestion = $(this).attr('data-suggestion');
        return self.select(suggestion);
      });
    };
    TagSuggestion.prototype.show = function(input) {
      var self;
      if (this.input === input) {
        return;
      }
      if ($.trim(input).length === 0) {
        return this.dom.suggestion_box.slideUp();
      }
      self = this;
      this.input = input;
      return this.get_suggestions(input, function(options_list) {
        self.options_list = options_list;
        if (options_list.length > 0) {
          self.dom.suggestion_box.html('');
          _.each(options_list, function(s) {
            return self.dom.suggestion_box.append(self.render(s));
          });
          self.dom.suggestion_box.slideDown('fast');
          return self.selected_index = -1;
        } else {
          return self.dom.suggestion_box.slideUp('fast');
        }
      });
    };
    TagSuggestion.prototype.render = function(s) {
      return $('<li/>').addClass('e-suggestion').attr('data-suggestion', s).text(s);
    };
    TagSuggestion.prototype.close = function() {
      this.input = "";
      return this.dom.suggestion_box.hide();
    };
    TagSuggestion.prototype.highlight_element = function(n) {
      n || (n = this.selected_index);
      this.dom.suggestion_box.find('li').removeClass('highlighted');
      return this.dom.suggestion_box.find("li:nth-child(" + (n + 1) + ")").addClass('highlighted');
    };
    return TagSuggestion;
  })();
  TagInput = (function() {
    function TagInput(ch, options) {
      this.channel = ch;
      this.channel.subscribe('input:clear', (function() {
        return this.dom.input.val('');
      }), this);
      this.suggest = _.debounce(this._suggest, options.debounce || 300);
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagInput.prototype.initialize_dom = function() {
      return {
        input: $('.e-tgwd-input')
      };
    };
    TagInput.prototype._suggest = function(value) {
      return this.channel.publish('suggest:show', value);
    };
    TagInput.prototype.bind_events = function(dom) {
      var self;
      self = this;
      dom.input.keydown(function(e) {
        var value;
        value = self.dom.input.val();
        switch (e.keyCode) {
          case 8:
            if (value.length === 0) {
              return self.channel.publish('accumulator:delete-last');
            }
        }
      });
      dom.input.keyup(function(e) {
        var value;
        value = self.dom.input.val();
        switch (e.keyCode) {
          case 40:
            return self.channel.publish('suggest:next');
          case 38:
            return self.channel.publish('suggest:prev');
          case 32:
          case 188:
            return self.channel.publish('input:tag', value);
          case 13:
            return self.channel.publish('suggest:select');
          default:
            return self.suggest(value);
        }
      });
      return dom.input.blur(function() {
        var value;
        value = self.dom.input.val();
        return self.channel.publish('input:tag', value);
      });
    };
    return TagInput;
  })();
  TagWidget = (function() {
    function TagWidget(options) {
      var input;
      if (options == null) {
        options = {};
      }
      if (!(input = options.input)) {
        throw new Error('Please give me an input!');
      }
      this.wrap_input(input);
      this.channel = new Channel();
      this.input = new TagInput(this.channel, options);
      this.accumulator = new TagAcumulator(this.channel, options);
      this.suggest = new TagSuggestion(this.channel, options);
      this.channel.subscribe('suggest:selected', this.read_tag, this);
      this.channel.subscribe('input:tag', this.read_tag, this);
    }
    TagWidget.prototype.read_tag = function(input) {
      var value;
      value = input.trim().replace(/\W/g, '');
      if (!(value.length <= 0)) {
        this.channel.publish('accumulator:store', value);
      }
      this.channel.publish('suggest:close');
      return this.channel.publish('input:clear');
    };
    TagWidget.prototype.selected_suggestion = function(suggestion) {
      return this.read_input(suggestion);
    };
    TagWidget.prototype.get_tags = function() {
      return this.accumulator.stored_tags;
    };
    TagWidget.prototype.wrap_input = function(selector) {
      var input, input_li, store, suggest_box, surround_box;
      input = $(selector).addClass('e-tgwd-input');
      surround_box = $('<div/>').addClass('e-tgwd-box');
      store = $('<ul/>').addClass('e-tgwd-list-store');
      input_li = $('<li/>').addClass('e-tgwd-input-li');
      suggest_box = $('<ul/>').addClass('e-tgwd-suggest-box');
      input.wrap(surround_box).wrap(store).wrap(input_li);
      return $('.e-tgwd-box').append(suggest_box).click(function() {
        return input.focus();
      });
    };
    return TagWidget;
  })();
  /* HIPOTHETIC USE CASE
  */
  $(function() {
    var sugs;
    sugs = ['a'];
    window.tw = new TagWidget({
      input: '#demo2-input',
      suggestions: ['hey!', 'hello', 'aloha', 'bonjorno', 'hola!']
    });
    return $('.e-demo2-button').click(function() {
      return console.log(tw.get_tags());
    });
  });
}).call(this);
