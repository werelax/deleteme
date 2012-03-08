(function() {
  var Channel, TagAcumulator, TagInput, TagSuggestion, TagWidget;
  var __slice = Array.prototype.slice;
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
    function TagAcumulator(ch) {
      this.channel = ch;
      this.channel.subscribe('accumulator:store', this.store, this);
      this.channel.subscribe('accumulator:delete-last', this.delete_last, this);
      this.stored_tags = [];
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagAcumulator.prototype.store = function(tag) {
      this.stored_tags.push(tag);
      return this.dom.tag_list.append(this.render(tag));
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
        tag_list: $('#demo2-tag-list')
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
    function TagSuggestion(ch) {
      this.channel = ch;
      this.channel.subscribe('suggest:show', this.show, this);
      this.channel.subscribe('suggest:close', this.close, this);
      this.channel.subscribe('suggest:next', this.go_next, this);
      this.channel.subscribe('suggest:prev', this.go_prev, this);
      this.channel.subscribe('suggest:select', this.select, this);
      this.input = null;
      this.selected_index = 0;
      this.available_values = ["hola", "hello", "ahoy!", "bonjorno", "halo", "buenas", "akandemorl", "jarl"];
      this.options_list = [];
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagSuggestion.prototype.initialize_dom = function() {
      return {
        suggestion_box: $('#demo2-suggestion-box')
      };
    };
    TagSuggestion.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.suggestion_box.delegate('li.e-suggestion', 'click', function() {
        var suggestion;
        suggestion = $(this).attr('data-suggestion');
        return self.select_suggestion(suggestion);
      });
    };
    TagSuggestion.prototype.show = function(input) {
      var self;
      if (this.input === input) {
        return;
      }
      if (input.length === 0) {
        return this.dom.suggestion_box.slideUp();
      }
      self = this;
      this.input = input;
      this.options_list = _.filter(this.available_values, function(w) {
        return w.match(input);
      });
      if (this.options_list.length > 0) {
        this.dom.suggestion_box.html('');
        _.each(this.options_list, function(s) {
          return self.dom.suggestion_box.append(self.render(s));
        });
        this.dom.suggestion_box.slideDown();
        return this.selected_index = -1;
      } else {
        return this.dom.suggestion_box.slideUp();
      }
    };
    TagSuggestion.prototype.render = function(s) {
      return $('<li/>').addClass('e-suggestion').attr('data-suggestion', s).text(s);
    };
    TagSuggestion.prototype.close = function() {
      return this.dom.suggestion_box.hide();
    };
    TagSuggestion.prototype.go_next = function() {
      this.selected_index = Math.min(this.options_list.length - 1, this.selected_index + 1);
      return this.highlight_element();
    };
    TagSuggestion.prototype.go_prev = function() {
      this.selected_index = Math.max(0, this.selected_index - 1);
      return this.highlight_element();
    };
    TagSuggestion.prototype.highlight_element = function(n) {
      n || (n = this.selected_index);
      this.dom.suggestion_box.find('li').css('color', '');
      return this.dom.suggestion_box.find("li:nth-child(" + (n + 1) + ")").css('color', 'red');
    };
    TagSuggestion.prototype.select = function(selected) {
      selected || (selected = this.options_list[this.selected_index]);
      this.channel.publish('suggest:selected', selected);
      return this.close_box();
    };
    return TagSuggestion;
  })();
  TagInput = (function() {
    function TagInput(ch) {
      this.channel = ch;
      this.channel.subscribe('input:clear', (function() {
        return this.dom.input.val('');
      }), this);
      this.dom = this.initialize_dom();
      this.bind_events(this.dom);
    }
    TagInput.prototype.initialize_dom = function() {
      return {
        input: $('#demo2-input')
      };
    };
    TagInput.prototype.bind_events = function(dom) {
      var self;
      self = this;
      return dom.input.keyup(function(e) {
        var value;
        value = self.dom.input.val();
        switch (e.keyCode) {
          case 40:
            self.channel.publish('suggest:next');
            break;
          case 38:
            self.channel.publish('suggest:prev');
            break;
          case 32:
          case 188:
            self.channel.publish('input:tag', value);
            break;
          case 13:
            self.channel.publish('suggest:select');
            break;
          case 8:
            if (value.length === 0) {
              self.channel.publish('accumulator:delete-last');
            }
        }
        return self.channel.publish('suggest:show', value);
      });
    };
    return TagInput;
  })();
  TagWidget = (function() {
    function TagWidget() {
      this.channel = new Channel();
      this.input = new TagInput(this.channel);
      this.accumulator = new TagAcumulator(this.channel);
      this.suggest = new TagSuggestion(this.channel);
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
    return TagWidget;
  })();
  $(function() {
    return window.tag_input = new TagWidget();
  });
}).call(this);
