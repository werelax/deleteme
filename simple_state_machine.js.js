(function() {
  var SimpleStateMachine, exports;
  var __slice = Array.prototype.slice, __indexOf = Array.prototype.indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (this[i] === item) return i;
    }
    return -1;
  };
  SimpleStateMachine = (function() {
    function SimpleStateMachine(state_connections) {
      var all_states, k, sm, _i, _len;
      this.context || (this.context = {});
      this.allowed = state_connections;
      all_states = _.keys(state_connections);
      sm = this;
      this.go = {};
      _.each(all_states, function(state) {
        return sm.go[state] = _.bind(sm.do_transition, sm, state);
      });
      this.states = {};
      for (_i = 0, _len = all_states.length; _i < _len; _i++) {
        k = all_states[_i];
        this.states[k] = {};
      }
      this.transition_map = {};
    }
    SimpleStateMachine.prototype.set_context = function(ctx) {
      this.context = ctx;
      return this.context.sm = {
        go: this.go,
        send: _.bind(this.send, this)
      };
    };
    SimpleStateMachine.prototype.do_transition = function() {
      var args, dest;
      dest = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (__indexOf.call(this.allowed[this.current_state], dest) >= 0) {
        console.log("" + this.current_state + " -> " + dest);
        this.leave_state.call(this, this.current_state, args);
        return this.enter_state.call(this, dest, args);
      }
    };
    SimpleStateMachine.prototype.do_action = function(action, state, ctx, args) {
      if (!((this.states[state] != null) && (this.states[state][action] != null))) {
        return;
      }
      args || (args = []);
      ctx || (ctx = {});
      return this.states[state][action].apply(ctx, args);
    };
    SimpleStateMachine.prototype.enter_state = function(state, args) {
      var enter_fn;
      this.current_state = state;
      if (typeof this.states[state] === 'function' && !(this.states[state].enter != null)) {
        enter_fn = this.states[state];
        this.states[state] = {
          enter: enter_fn
        };
      }
      return this.do_action('enter', state, this.context, args);
    };
    SimpleStateMachine.prototype.leave_state = function(state, args) {
      if (!((this.states[state] != null) && (this.states[state].leave != null))) {
        return;
      }
      return this.do_action('leave', state, this.context, args);
    };
    SimpleStateMachine.prototype.start = function(initial_state, args) {
      return this.enter_state(initial_state, args);
    };
    SimpleStateMachine.prototype.transitions = function(transition_map) {
      this.transition_map = transition_map;
    };
    SimpleStateMachine.prototype.send = function() {
      var allowed_events, args, event, next;
      event = arguments[0], args = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      if (!(allowed_events = this.transition_map[this.current_state])) {
        return;
      }
      if (next = allowed_events[event]) {
        return this.do_transition.apply(this, [next].concat(args));
      }
    };
    return SimpleStateMachine;
  })();
  exports = (this['W'] || (this['W'] = {}));
  exports['SimpleStateMachine'] = SimpleStateMachine;
  /* Example
  
  sm = new SimpleStateMachine
    uno: ['dos'],
    dos: ['uno', 'dos', 'tres'],
    tres: ['uno']
  
  sm.states.uno =
    enter: (something) ->
      this.go.dos('hey!')
    leave: ->
  
  sm.states.dos =
    enter: (msg) ->
      console.log msg
      this.go.tres()
  
  */
}).call(this);
