class SimpleStateMachine
  constructor: (state_connections) ->
    # State-handler execution context
    @context ||= {}
    # FSM graph
    @allowed = state_connections
    # Context addendum for explicit transitions
    all_states = _.keys(state_connections)
    sm = @; @go = {}
    _.each all_states, (state) ->
      sm.go[state] = _.bind(sm.do_transition, sm, state)
    # Holder for state action descriptions
    @states = {}
    @states[k] = {} for k in all_states
    # Facade for sending inputs
    @transition_map = {}

  set_context: (ctx) ->
    @context = ctx
    @context.sm = {go: @go, send: _.bind(@send, @)}

  do_transition: (dest, args) ->
    if dest in @allowed[@current_state]
      console.log "#{@current_state} -> #{dest}"
      @leave_state.call(@, @current_state, args)
      @enter_state.call(@, dest, args)

  do_action: (action, state, ctx, args) ->
    return unless @states[state]? and @states[state][action]?
    args ||= []; ctx ||= {}
    @states[state][action].apply(ctx, args)

  enter_state: (state, args) ->
    @current_state = state
    if typeof(@states[state]) == 'function' && !@states[state].enter?
      enter_fn = @states[state]
      @states[state] = {enter: enter_fn}
    @do_action('enter', state, @context, args)

  leave_state: (state, args) ->
    return unless @states[state]? and @states[state].leave?
    @do_action('leave', state, @context, args)

  start: (initial_state, args) ->
    @enter_state(initial_state, args)

  transitions: (@transition_map) ->

  send: (event, args...) ->
    return unless allowed_events = @transition_map[@current_state]
    if next = allowed_events[event]
      @do_transition next, args

# Exports

exports = (this['W'] ||= {})
exports['SimpleStateMachine'] = SimpleStateMachine

### Example

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

###
