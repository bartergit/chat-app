
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.30.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\ChatCreation.svelte generated by Svelte v3.30.0 */

    const file = "src\\ChatCreation.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[7] = list[i];
    	return child_ctx;
    }

    // (77:12) {#if user.id !== myId }
    function create_if_block(ctx) {
    	let p;
    	let input;
    	let input_name_value;
    	let input_value_value;
    	let t_value = /*user*/ ctx[7].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			input = element("input");
    			t = text(t_value);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "name", input_name_value = /*user*/ ctx[7].id);
    			input.value = input_value_value = true;
    			attr_dev(input, "class", "svelte-1j25wuj");
    			add_location(input, file, 77, 19, 1860);
    			attr_dev(p, "class", "svelte-1j25wuj");
    			add_location(p, file, 77, 16, 1857);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, input);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*users*/ 1 && input_name_value !== (input_name_value = /*user*/ ctx[7].id)) {
    				attr_dev(input, "name", input_name_value);
    			}

    			if (dirty & /*users*/ 1 && t_value !== (t_value = /*user*/ ctx[7].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(77:12) {#if user.id !== myId }",
    		ctx
    	});

    	return block;
    }

    // (76:8) {#each users as user}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let if_block = /*user*/ ctx[7].id !== /*myId*/ ctx[2] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*user*/ ctx[7].id !== /*myId*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(76:8) {#each users as user}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let form;
    	let p0;
    	let input0;
    	let t0;
    	let button;
    	let t2;
    	let input1;
    	let t3;
    	let p1;
    	let t4;
    	let t5;
    	let mounted;
    	let dispose;
    	let each_value = /*users*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			form = element("form");
    			p0 = element("p");
    			input0 = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "X";
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			p1 = element("p");
    			t4 = text(/*message*/ ctx[3]);
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(input0, "type", "submit");
    			input0.value = "Create chat";
    			add_location(input0, file, 68, 12, 1517);
    			add_location(button, file, 69, 12, 1572);
    			attr_dev(p0, "class", "svelte-1j25wuj");
    			add_location(p0, file, 67, 8, 1501);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "chat_name");
    			attr_dev(input1, "placeholder", "Chat name");
    			input1.required = true;
    			attr_dev(input1, "class", "svelte-1j25wuj");
    			add_location(input1, file, 73, 8, 1661);
    			set_style(p1, "color", "red");
    			attr_dev(p1, "class", "svelte-1j25wuj");
    			add_location(p1, file, 74, 8, 1740);
    			add_location(form, file, 66, 4, 1448);
    			attr_dev(div, "class", "window svelte-1j25wuj");
    			add_location(div, file, 65, 0, 1423);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, form);
    			append_dev(form, p0);
    			append_dev(p0, input0);
    			append_dev(p0, t0);
    			append_dev(p0, button);
    			append_dev(form, t2);
    			append_dev(form, input1);
    			append_dev(form, t3);
    			append_dev(form, p1);
    			append_dev(p1, t4);
    			append_dev(form, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(form, null);
    			}

    			if (!mounted) {
    				dispose = [
    					listen_dev(
    						button,
    						"click",
    						function () {
    							if (is_function(/*hide*/ ctx[1])) /*hide*/ ctx[1].apply(this, arguments);
    						},
    						false,
    						false,
    						false
    					),
    					listen_dev(form, "submit", prevent_default(/*createChat*/ ctx[4]), false, true, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			if (dirty & /*message*/ 8) set_data_dev(t4, /*message*/ ctx[3]);

    			if (dirty & /*users, myId*/ 5) {
    				each_value = /*users*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(form, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("ChatCreation", slots, []);
    	let { users } = $$props;
    	let { hide } = $$props;
    	let { receiveChats } = $$props;
    	let { myId } = $$props;
    	let { chats } = $$props;
    	let message = "";

    	function createChat(e) {
    		$$invalidate(3, message = "");
    		const formData = new FormData(e.target);
    		const chatName = formData.get("chat_name");
    		let usersToAdd = [];

    		for (let i in users) {
    			if (formData.get(users[i].id) == "true") {
    				usersToAdd.push(users[i].id);
    			}
    		}

    		if (usersToAdd.length == 0) {
    			$$invalidate(3, message = "select at least 1 user");
    		} else {
    			usersToAdd.push(myId);

    			fetch("./addChat", {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify({ usersToAdd, chatName })
    			}).then(response => {
    				if (response.ok) {
    					receiveChats();
    					hide();
    				} else {
    					$$invalidate(3, message = "failed to add chat");
    				}
    			});
    		}
    	}

    	const writable_props = ["users", "hide", "receiveChats", "myId", "chats"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<ChatCreation> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("users" in $$props) $$invalidate(0, users = $$props.users);
    		if ("hide" in $$props) $$invalidate(1, hide = $$props.hide);
    		if ("receiveChats" in $$props) $$invalidate(5, receiveChats = $$props.receiveChats);
    		if ("myId" in $$props) $$invalidate(2, myId = $$props.myId);
    		if ("chats" in $$props) $$invalidate(6, chats = $$props.chats);
    	};

    	$$self.$capture_state = () => ({
    		users,
    		hide,
    		receiveChats,
    		myId,
    		chats,
    		message,
    		createChat
    	});

    	$$self.$inject_state = $$props => {
    		if ("users" in $$props) $$invalidate(0, users = $$props.users);
    		if ("hide" in $$props) $$invalidate(1, hide = $$props.hide);
    		if ("receiveChats" in $$props) $$invalidate(5, receiveChats = $$props.receiveChats);
    		if ("myId" in $$props) $$invalidate(2, myId = $$props.myId);
    		if ("chats" in $$props) $$invalidate(6, chats = $$props.chats);
    		if ("message" in $$props) $$invalidate(3, message = $$props.message);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [users, hide, myId, message, createChat, receiveChats, chats];
    }

    class ChatCreation extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			users: 0,
    			hide: 1,
    			receiveChats: 5,
    			myId: 2,
    			chats: 6
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChatCreation",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*users*/ ctx[0] === undefined && !("users" in props)) {
    			console.warn("<ChatCreation> was created without expected prop 'users'");
    		}

    		if (/*hide*/ ctx[1] === undefined && !("hide" in props)) {
    			console.warn("<ChatCreation> was created without expected prop 'hide'");
    		}

    		if (/*receiveChats*/ ctx[5] === undefined && !("receiveChats" in props)) {
    			console.warn("<ChatCreation> was created without expected prop 'receiveChats'");
    		}

    		if (/*myId*/ ctx[2] === undefined && !("myId" in props)) {
    			console.warn("<ChatCreation> was created without expected prop 'myId'");
    		}

    		if (/*chats*/ ctx[6] === undefined && !("chats" in props)) {
    			console.warn("<ChatCreation> was created without expected prop 'chats'");
    		}
    	}

    	get users() {
    		throw new Error("<ChatCreation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set users(value) {
    		throw new Error("<ChatCreation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hide() {
    		throw new Error("<ChatCreation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hide(value) {
    		throw new Error("<ChatCreation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get receiveChats() {
    		throw new Error("<ChatCreation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set receiveChats(value) {
    		throw new Error("<ChatCreation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get myId() {
    		throw new Error("<ChatCreation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set myId(value) {
    		throw new Error("<ChatCreation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get chats() {
    		throw new Error("<ChatCreation>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chats(value) {
    		throw new Error("<ChatCreation>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Message.svelte generated by Svelte v3.30.0 */

    const file$1 = "src\\Message.svelte";

    function create_fragment$1(ctx) {
    	let link;
    	let t0;
    	let div3;
    	let div0;
    	let img;
    	let img_src_value;
    	let t1;
    	let div2;
    	let span0;
    	let t2;
    	let t3;
    	let div1;
    	let p;
    	let t4_value = /*message*/ ctx[0].content + "";
    	let t4;
    	let t5;
    	let span1;
    	let t6_value = new Date(/*message*/ ctx[0].time).toLocaleString() + "";
    	let t6;

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			div3 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t1 = space();
    			div2 = element("div");
    			span0 = element("span");
    			t2 = text(/*name*/ ctx[2]);
    			t3 = space();
    			div1 = element("div");
    			p = element("p");
    			t4 = text(t4_value);
    			t5 = space();
    			span1 = element("span");
    			t6 = text(t6_value);
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "type", "text/css");
    			attr_dev(link, "href", "message.css");
    			add_location(link, file$1, 6, 2, 105);
    			if (img.src !== (img_src_value = "user-profile.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "icon");
    			add_location(img, file$1, 10, 23, 255);
    			attr_dev(div0, "class", "img_div");
    			add_location(div0, file$1, 10, 2, 234);
    			add_location(span0, file$1, 12, 4, 337);
    			add_location(p, file$1, 14, 6, 399);
    			attr_dev(span1, "class", "time");
    			add_location(span1, file$1, 15, 6, 431);
    			attr_dev(div1, "class", "message_itself");
    			add_location(div1, file$1, 13, 4, 363);
    			attr_dev(div2, "class", "content_div");
    			add_location(div2, file$1, 11, 2, 306);
    			attr_dev(div3, "class", "incoming_msg");
    			toggle_class(div3, "right", /*self*/ ctx[1]);
    			add_location(div3, file$1, 9, 0, 185);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div0, img);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    			append_dev(div2, span0);
    			append_dev(span0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, p);
    			append_dev(p, t4);
    			append_dev(div1, t5);
    			append_dev(div1, span1);
    			append_dev(span1, t6);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*name*/ 4) set_data_dev(t2, /*name*/ ctx[2]);
    			if (dirty & /*message*/ 1 && t4_value !== (t4_value = /*message*/ ctx[0].content + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*message*/ 1 && t6_value !== (t6_value = new Date(/*message*/ ctx[0].time).toLocaleString() + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*self*/ 2) {
    				toggle_class(div3, "right", /*self*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Message", slots, []);
    	let { message } = $$props;
    	let { self } = $$props;
    	let { name } = $$props;
    	const writable_props = ["message", "self", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Message> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    		if ("self" in $$props) $$invalidate(1, self = $$props.self);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ message, self, name });

    	$$self.$inject_state = $$props => {
    		if ("message" in $$props) $$invalidate(0, message = $$props.message);
    		if ("self" in $$props) $$invalidate(1, self = $$props.self);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [message, self, name];
    }

    class Message extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { message: 0, self: 1, name: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Message",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*message*/ ctx[0] === undefined && !("message" in props)) {
    			console.warn("<Message> was created without expected prop 'message'");
    		}

    		if (/*self*/ ctx[1] === undefined && !("self" in props)) {
    			console.warn("<Message> was created without expected prop 'self'");
    		}

    		if (/*name*/ ctx[2] === undefined && !("name" in props)) {
    			console.warn("<Message> was created without expected prop 'name'");
    		}
    	}

    	get message() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set message(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get self() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set self(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Message>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Message>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Chat.svelte generated by Svelte v3.30.0 */

    const { console: console_1, document: document_1 } = globals;
    const file$2 = "src\\Chat.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    // (128:0) {#if isChatCreationMenuVisible && ready}
    function create_if_block_2(ctx) {
    	let chatcreation;
    	let current;

    	chatcreation = new ChatCreation({
    			props: {
    				users: /*users*/ ctx[1],
    				receiveChats: /*receiveChats*/ ctx[12],
    				chats: /*chats*/ ctx[2],
    				myId: /*myId*/ ctx[3],
    				hide: /*func*/ ctx[14]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(chatcreation.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(chatcreation, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const chatcreation_changes = {};
    			if (dirty & /*users*/ 2) chatcreation_changes.users = /*users*/ ctx[1];
    			if (dirty & /*chats*/ 4) chatcreation_changes.chats = /*chats*/ ctx[2];
    			if (dirty & /*myId*/ 8) chatcreation_changes.myId = /*myId*/ ctx[3];
    			if (dirty & /*isChatCreationMenuVisible*/ 64) chatcreation_changes.hide = /*func*/ ctx[14];
    			chatcreation.$set(chatcreation_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chatcreation.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chatcreation.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(chatcreation, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(128:0) {#if isChatCreationMenuVisible && ready}",
    		ctx
    	});

    	return block;
    }

    // (131:0) {#if ready}
    function create_if_block$1(ctx) {
    	let div6;
    	let t0;
    	let div1;
    	let div0;
    	let h2;
    	let t2;
    	let button0;
    	let t4;
    	let t5;
    	let div5;
    	let div3;
    	let div2;
    	let b;
    	let t6_value = /*currentChat*/ ctx[4].chat_name + "";
    	let t6;
    	let t7;
    	let button1;
    	let t9;
    	let form;
    	let span;
    	let t10;
    	let t11_value = /*findUserById*/ ctx[13](/*myId*/ ctx[3]).login + "";
    	let t11;
    	let t12;
    	let t13_value = /*findUserById*/ ctx[13](/*myId*/ ctx[3]).name + "";
    	let t13;
    	let input0;
    	let t14;
    	let t15;
    	let div4;
    	let p;
    	let input1;
    	let t16;
    	let button2;
    	let current;
    	let mounted;
    	let dispose;
    	let if_block = /*viewMembers*/ ctx[8] && create_if_block_1(ctx);
    	let each_value_1 = /*chats*/ ctx[2];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	let each_value = /*messages*/ ctx[0][/*currentChat*/ ctx[4].id];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			if (if_block) if_block.c();
    			t0 = space();
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "Chats:";
    			t2 = space();
    			button0 = element("button");
    			button0.textContent = "+";
    			t4 = space();

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t5 = space();
    			div5 = element("div");
    			div3 = element("div");
    			div2 = element("div");
    			b = element("b");
    			t6 = text(t6_value);
    			t7 = space();
    			button1 = element("button");
    			button1.textContent = "View members";
    			t9 = space();
    			form = element("form");
    			span = element("span");
    			t10 = text("@");
    			t11 = text(t11_value);
    			t12 = space();
    			t13 = text(t13_value);
    			input0 = element("input");
    			t14 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t15 = space();
    			div4 = element("div");
    			p = element("p");
    			input1 = element("input");
    			t16 = space();
    			button2 = element("button");
    			button2.textContent = "Send";
    			add_location(h2, file$2, 143, 16, 4688);
    			add_location(button0, file$2, 144, 16, 4721);
    			attr_dev(div0, "class", "vertical");
    			add_location(div0, file$2, 142, 12, 4648);
    			attr_dev(div1, "class", "leftSide");
    			add_location(div1, file$2, 141, 8, 4612);
    			add_location(b, file$2, 167, 20, 5541);
    			set_style(button1, "width", "auto");
    			add_location(button1, file$2, 168, 20, 5593);
    			set_style(span, "margin-right", "20px");
    			add_location(span, file$2, 169, 44, 5728);
    			attr_dev(input0, "type", "submit");
    			input0.value = "Log out";
    			add_location(input0, file$2, 170, 115, 5850);
    			attr_dev(form, "action", "./logout");
    			add_location(form, file$2, 169, 20, 5704);
    			attr_dev(div2, "class", "upperPanel");
    			add_location(div2, file$2, 166, 16, 5495);
    			attr_dev(div3, "class", "messages");
    			add_location(div3, file$2, 165, 12, 5455);
    			attr_dev(input1, "type", "text");
    			add_location(input1, file$2, 182, 20, 6346);
    			add_location(button2, file$2, 183, 20, 6416);
    			add_location(p, file$2, 181, 16, 6321);
    			attr_dev(div4, "class", "inputBox");
    			add_location(div4, file$2, 180, 12, 6281);
    			attr_dev(div5, "class", "rightSide");
    			add_location(div5, file$2, 164, 8, 5418);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$2, 131, 4, 4286);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			if (if_block) if_block.m(div6, null);
    			append_dev(div6, t0);
    			append_dev(div6, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, button0);
    			append_dev(div1, t4);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(div1, null);
    			}

    			append_dev(div6, t5);
    			append_dev(div6, div5);
    			append_dev(div5, div3);
    			append_dev(div3, div2);
    			append_dev(div2, b);
    			append_dev(b, t6);
    			append_dev(div2, t7);
    			append_dev(div2, button1);
    			append_dev(div2, t9);
    			append_dev(div2, form);
    			append_dev(form, span);
    			append_dev(span, t10);
    			append_dev(span, t11);
    			append_dev(span, t12);
    			append_dev(span, t13);
    			append_dev(form, input0);
    			append_dev(div3, t14);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div3, null);
    			}

    			append_dev(div5, t15);
    			append_dev(div5, div4);
    			append_dev(div4, p);
    			append_dev(p, input1);
    			set_input_value(input1, /*currentMessage*/ ctx[5]);
    			append_dev(p, t16);
    			append_dev(p, button2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[15], false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[17], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[18]),
    					listen_dev(button2, "click", /*sendMessage*/ ctx[11], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (/*viewMembers*/ ctx[8]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div6, t0);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*chats, currentChat, changeCurrentChat, getLastChatMessage*/ 1556) {
    				each_value_1 = /*chats*/ ctx[2];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(div1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if ((!current || dirty & /*currentChat*/ 16) && t6_value !== (t6_value = /*currentChat*/ ctx[4].chat_name + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty & /*myId*/ 8) && t11_value !== (t11_value = /*findUserById*/ ctx[13](/*myId*/ ctx[3]).login + "")) set_data_dev(t11, t11_value);
    			if ((!current || dirty & /*myId*/ 8) && t13_value !== (t13_value = /*findUserById*/ ctx[13](/*myId*/ ctx[3]).name + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*messages, currentChat, findUserById, myId*/ 8217) {
    				each_value = /*messages*/ ctx[0][/*currentChat*/ ctx[4].id];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div3, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty & /*currentMessage*/ 32 && input1.value !== /*currentMessage*/ ctx[5]) {
    				set_input_value(input1, /*currentMessage*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(131:0) {#if ready}",
    		ctx
    	});

    	return block;
    }

    // (133:8) {#if viewMembers}
    function create_if_block_1(ctx) {
    	let div;
    	let ul;
    	let each_value_2 = /*currentChat*/ ctx[4].members;
    	validate_each_argument(each_value_2);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(ul, file$2, 134, 16, 4386);
    			attr_dev(div, "class", "view");
    			add_location(div, file$2, 133, 12, 4350);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*findUserById, currentChat*/ 8208) {
    				each_value_2 = /*currentChat*/ ctx[4].members;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_2.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(133:8) {#if viewMembers}",
    		ctx
    	});

    	return block;
    }

    // (136:20) {#each currentChat.members as memberId}
    function create_each_block_2(ctx) {
    	let li;
    	let t_value = /*findUserById*/ ctx[13](/*memberId*/ ctx[28]).name + "";
    	let t;

    	const block = {
    		c: function create() {
    			li = element("li");
    			t = text(t_value);
    			add_location(li, file$2, 136, 24, 4477);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentChat*/ 16 && t_value !== (t_value = /*findUserById*/ ctx[13](/*memberId*/ ctx[28]).name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(136:20) {#each currentChat.members as memberId}",
    		ctx
    	});

    	return block;
    }

    // (149:12) {#each chats as chat}
    function create_each_block_1(ctx) {
    	let div1;
    	let div0;
    	let b;
    	let t0_value = /*chat*/ ctx[25].chat_name + "";
    	let t0;
    	let t1;
    	let p;
    	let raw_value = /*getLastChatMessage*/ ctx[9](/*chat*/ ctx[25].id) + "";
    	let t2;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[16](/*chat*/ ctx[25]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			b = element("b");
    			t0 = text(t0_value);
    			t1 = space();
    			p = element("p");
    			t2 = space();
    			add_location(b, file$2, 156, 24, 5172);
    			add_location(p, file$2, 157, 24, 5221);
    			attr_dev(div0, "class", "chat");
    			toggle_class(div0, "activeChat", /*chat*/ ctx[25].id === /*currentChat*/ ctx[4].id);
    			add_location(div0, file$2, 150, 20, 4934);
    			add_location(div1, file$2, 149, 16, 4907);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, b);
    			append_dev(b, t0);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			p.innerHTML = raw_value;
    			append_dev(div1, t2);

    			if (!mounted) {
    				dispose = listen_dev(div0, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*chats*/ 4 && t0_value !== (t0_value = /*chat*/ ctx[25].chat_name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*getLastChatMessage, chats*/ 516 && raw_value !== (raw_value = /*getLastChatMessage*/ ctx[9](/*chat*/ ctx[25].id) + "")) p.innerHTML = raw_value;
    			if (dirty & /*chats, currentChat*/ 20) {
    				toggle_class(div0, "activeChat", /*chat*/ ctx[25].id === /*currentChat*/ ctx[4].id);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(149:12) {#each chats as chat}",
    		ctx
    	});

    	return block;
    }

    // (174:16) {#each messages[currentChat.id] as message}
    function create_each_block$1(ctx) {
    	let message;
    	let current;

    	message = new Message({
    			props: {
    				message: /*message*/ ctx[22],
    				name: /*findUserById*/ ctx[13](/*message*/ ctx[22].from_user_id).name,
    				self: /*message*/ ctx[22].from_user_id === /*myId*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(message.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(message, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const message_changes = {};
    			if (dirty & /*messages, currentChat*/ 17) message_changes.message = /*message*/ ctx[22];
    			if (dirty & /*messages, currentChat*/ 17) message_changes.name = /*findUserById*/ ctx[13](/*message*/ ctx[22].from_user_id).name;
    			if (dirty & /*messages, currentChat, myId*/ 25) message_changes.self = /*message*/ ctx[22].from_user_id === /*myId*/ ctx[3];
    			message.$set(message_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(message.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(message.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(message, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(174:16) {#each messages[currentChat.id] as message}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let link;
    	let t0;
    	let t1;
    	let if_block1_anchor;
    	let current;
    	let if_block0 = /*isChatCreationMenuVisible*/ ctx[6] && /*ready*/ ctx[7] && create_if_block_2(ctx);
    	let if_block1 = /*ready*/ ctx[7] && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "type", "text/css");
    			attr_dev(link, "href", "chat.css");
    			add_location(link, file$2, 1, 4, 19);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*isChatCreationMenuVisible*/ ctx[6] && /*ready*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*isChatCreationMenuVisible, ready*/ 192) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*ready*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*ready*/ 128) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Chat", slots, []);

    	var __awaiter = this && this.__awaiter || function (thisArg, _arguments, P, generator) {
    		function adopt(value) {
    			return value instanceof P
    			? value
    			: new P(function (resolve) {
    						resolve(value);
    					});
    		}

    		return new (P || (P = Promise))(function (resolve, reject) {
    				function fulfilled(value) {
    					try {
    						step(generator.next(value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function rejected(value) {
    					try {
    						step(generator["throw"](value));
    					} catch(e) {
    						reject(e);
    					}
    				}

    				function step(result) {
    					result.done
    					? resolve(result.value)
    					: adopt(result.value).then(fulfilled, rejected);
    				}

    				step((generator = generator.apply(thisArg, _arguments || [])).next());
    			});
    	};

    	function changeCurrentChat(chat) {
    		$$invalidate(4, currentChat = chat);
    	}

    	function sendMessage() {
    		return __awaiter(this, void 0, void 0, function* () {
    			if (currentMessage.trim() != "") {
    				fetch("./sendMessage", {
    					method: "POST",
    					headers: { "Content-Type": "application/json" },
    					body: JSON.stringify({
    						content: currentMessage,
    						from_user_id: myId,
    						chat_id: currentChat.id
    					})
    				}).then(response => {
    					if (response.ok) {
    						receiveMessages();
    						$$invalidate(5, currentMessage = "");
    					} else {
    						console.error("error", response);
    					}
    				});
    			}
    		});
    	}

    	function receiveUsers() {
    		fetch("./receiveUsers").then(response => {
    			if (response.ok) {
    				response.json().then(data => {
    					$$invalidate(1, users = data);
    					receiveChats();
    				});
    			} else {
    				console.error("error", response);
    			}
    		});
    	}

    	function receiveChats() {
    		fetch("./receiveChats").then(response => {
    			if (response.ok) {
    				response.json().then(data => {
    					$$invalidate(2, chats = data);
    					$$invalidate(4, currentChat = data[0]);
    					receiveMessages();
    				});
    			} else {
    				console.error("error", response);
    			}
    		});
    	}

    	function receiveMessages() {
    		fetch("./receiveMessages").then(response => {
    			if (response.ok) {
    				response.json().then(data => {
    					$$invalidate(0, messages = data);

    					// console.log("ALl launched successfully");
    					$$invalidate(7, ready = true);
    				});
    			} else {
    				console.error("error", response);
    			}
    		});
    	}

    	document.addEventListener("keydown", event => {
    		if (event.code == "Enter") {
    			sendMessage();
    		}
    	});

    	function findUserById(id) {
    		for (let index = 0; index < users.length; index++) {
    			if (users[index].id == id) return users[index];
    		}
    	}

    	//------>
    	let users;

    	let chats;
    	let messages;
    	let myId;
    	let currentChat;
    	let currentMessage = "";
    	let isChatCreationMenuVisible = false;
    	let ready = false;
    	let viewMembers = false;

    	fetch("./me").then(response => {
    		if (response.ok) {
    			response.json().then(data => {
    				$$invalidate(3, myId = parseInt(data));
    				receiveUsers();
    			});
    		} else {
    			console.error("error", response);
    		}
    	});

    	setInterval(receiveMessages, 1000);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Chat> was created with unknown prop '${key}'`);
    	});

    	const func = () => $$invalidate(6, isChatCreationMenuVisible = false);
    	const click_handler = () => $$invalidate(6, isChatCreationMenuVisible = true);

    	const click_handler_1 = chat => {
    		changeCurrentChat(chat);
    	};

    	const click_handler_2 = () => $$invalidate(8, viewMembers = !viewMembers);

    	function input1_input_handler() {
    		currentMessage = this.value;
    		$$invalidate(5, currentMessage);
    	}

    	$$self.$capture_state = () => ({
    		__awaiter,
    		ChatCreation,
    		Message,
    		changeCurrentChat,
    		sendMessage,
    		receiveUsers,
    		receiveChats,
    		receiveMessages,
    		findUserById,
    		users,
    		chats,
    		messages,
    		myId,
    		currentChat,
    		currentMessage,
    		isChatCreationMenuVisible,
    		ready,
    		viewMembers,
    		getLastChatMessage
    	});

    	$$self.$inject_state = $$props => {
    		if ("__awaiter" in $$props) __awaiter = $$props.__awaiter;
    		if ("users" in $$props) $$invalidate(1, users = $$props.users);
    		if ("chats" in $$props) $$invalidate(2, chats = $$props.chats);
    		if ("messages" in $$props) $$invalidate(0, messages = $$props.messages);
    		if ("myId" in $$props) $$invalidate(3, myId = $$props.myId);
    		if ("currentChat" in $$props) $$invalidate(4, currentChat = $$props.currentChat);
    		if ("currentMessage" in $$props) $$invalidate(5, currentMessage = $$props.currentMessage);
    		if ("isChatCreationMenuVisible" in $$props) $$invalidate(6, isChatCreationMenuVisible = $$props.isChatCreationMenuVisible);
    		if ("ready" in $$props) $$invalidate(7, ready = $$props.ready);
    		if ("viewMembers" in $$props) $$invalidate(8, viewMembers = $$props.viewMembers);
    		if ("getLastChatMessage" in $$props) $$invalidate(9, getLastChatMessage = $$props.getLastChatMessage);
    	};

    	let getLastChatMessage;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*messages*/ 1) {
    			 $$invalidate(9, getLastChatMessage = chatId => {
    				if (messages != undefined && chatId != undefined && messages[chatId] != undefined && messages[chatId].length > 0) {
    					let lastMessage = messages[chatId][messages[chatId].length - 1];

    					return `<b>${findUserById(lastMessage.from_user_id).name}:
		</b>${lastMessage.content.slice(0, 20)}${lastMessage.content.length < 20 ? "" : "..."}`;
    				} else {
    					return "<b>Noone:</b>Nothing";
    				}
    			});
    		}
    	};

    	return [
    		messages,
    		users,
    		chats,
    		myId,
    		currentChat,
    		currentMessage,
    		isChatCreationMenuVisible,
    		ready,
    		viewMembers,
    		getLastChatMessage,
    		changeCurrentChat,
    		sendMessage,
    		receiveChats,
    		findUserById,
    		func,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input1_input_handler
    	];
    }

    class Chat extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Chat",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    const app = new Chat({
        target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
