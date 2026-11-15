/* Cheat sheet: copy-ready commands with the context that makes them safe. */
(function () {
  "use strict";
  const KK = window.KK;
  const $ = KK.$;
  const $$ = KK.$$;

  const SECTIONS = [
    {
      id: "kubectl",
      label: "kubectl basics",
      blurb: "Observe first. The fastest way to a wrong answer is guessing before reading cluster state.",
      items: [
        { title: "See everything in a namespace", cmd: "kubectl get all -n <namespace>", note: "Pods, services, deployments, replica sets, and stateful sets in one view. Add -o wide for nodes and IPs." },
        { title: "List pods across the cluster", cmd: "kubectl get pods -A -o wide", note: "Always confirm the namespace before concluding a pod is missing." },
        { title: "Explain why a pod is stuck", cmd: "kubectl describe pod <pod> -n <namespace>", note: "Read Events at the bottom: image pull, scheduling, probe, and mount failures are named there." },
        { title: "Follow logs", cmd: "kubectl logs <pod> -c <container> --tail=100 -f", note: "-c is required when a pod has more than one container. Add --previous for a crashed container." },
        { title: "Open a shell", cmd: "kubectl exec -it <pod> -n <namespace> -- sh", note: "Use sh when the image has no bash. You are inside the container's mount and network namespace." },
        { title: "Apply and delete a manifest", cmd: "kubectl apply -f <file>.yaml\nkubectl delete -f <file>.yaml", note: "apply is declarative and records the last applied configuration. Prefer it to create for repeatable work." },
        { title: "Check what would change", cmd: "kubectl diff -f <file>.yaml", note: "Shows the server-side change before you apply it. Useful in review and exam practice." },
        { title: "Watch a rollout", cmd: "kubectl rollout status deployment/<name> -n <namespace>", note: "Pair with kubectl rollout history and kubectl rollout undo when a release misbehaves." },
        { title: "Read events by time", cmd: "kubectl get events -A --sort-by=.lastTimestamp", note: "Events expire. Capture them while reproducing the failure." },
        { title: "Wait for readiness", cmd: "kubectl wait --for=condition=Ready pod -l app=<label> --timeout=120s", note: "Better than sleep in scripts and CI." },
        { title: "Port-forward for a local check", cmd: "kubectl port-forward svc/<service> 8080:80 -n <namespace>", note: "Tunnels through the API server; it does not prove an Ingress or external path works." },
        { title: "Check permissions", cmd: "kubectl auth can-i get pods --as=system:serviceaccount:<ns>:<sa>", note: "Use --list to see the full effective rule set for the current identity." }
      ]
    },
    {
      id: "workloads",
      label: "Workloads",
      blurb: "Generate a manifest, inspect it, then apply it. Dry runs are the exam's best friend.",
      items: [
        { title: "Generate a pod manifest", cmd: "kubectl run <pod> --image=<image> --dry-run=client -o yaml > pod.yaml", note: "Nothing is created until you apply the file. Change the image tag before production." },
        { title: "Generate a deployment", cmd: "kubectl create deployment <name> --image=<image> --replicas=3 --dry-run=client -o yaml > deploy.yaml", note: "Add strategy, probes, and resources before applying for anything real." },
        { title: "Scale a deployment", cmd: "kubectl scale deployment/<name> --replicas=5 -n <namespace>", note: "A horizontal change, not a rollout. HPA can own replicas later." },
        { title: "Update an image", cmd: "kubectl set image deployment/<name> <container>=<image>:<tag> -n <namespace>", note: "Triggers a new ReplicaSet and rollout. Verify with rollout status." },
        { title: "Roll back", cmd: "kubectl rollout undo deployment/<name> -n <namespace>", note: "Add --to-revision=<n> to return to a specific revision." },
        { title: "Inspect API fields", cmd: "kubectl explain deployment.spec.strategy --recursive", note: "Faster and more reliable than memorising field names, especially under exam pressure." },
        { title: "Create a ConfigMap", cmd: "kubectl create configmap <name> --from-literal=KEY=value -n <namespace>", note: "Use --from-file for files. ConfigMaps are not secret storage." },
        { title: "Create a Secret", cmd: "kubectl create secret generic <name> --from-literal=password='<value>' -n <namespace>", note: "Base64 is encoding, not encryption. Use an external secret store in production." },
        { title: "Duplicate a resource safely", cmd: "kubectl get deployment <name> -n <namespace> -o yaml > deploy.yaml", note: "Delete the status, resourceVersion, uid, and creationTimestamp fields before reapplying elsewhere." },
        { title: "Run a throwaway client", cmd: "kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -- sh", note: "Useful for DNS and service checks. Pin the image so the test is reproducible." }
      ]
    },
    {
      id: "networking",
      label: "Networking & storage",
      blurb: "A Service selects pods by label. A volume must exist before the pod that mounts it.",
      items: [
        { title: "Expose a deployment", cmd: "kubectl expose deployment/<name> --port=80 --target-port=8080 --type=ClusterIP", note: "The selector is copied from the deployment. Check it after renaming labels." },
        { title: "Debug service endpoints", cmd: "kubectl get endpointslices -n <namespace> -l kubernetes.io/service-name=<svc>", note: "No endpoints usually means the selector does not match any ready pod." },
        { title: "Resolve a service from inside", cmd: "kubectl run tmp --rm -it --image=busybox:1.36 --restart=Never -- nslookup <service>.<namespace>.svc.cluster.local", note: "Use the fully qualified name when testing cross-namespace DNS." },
        { title: "List network policies", cmd: "kubectl get networkpolicy -A", note: "An empty list does not mean traffic is unrestricted; CNI behaviour and default-deny policies matter." },
        { title: "Inspect storage classes", cmd: "kubectl get storageclass", note: "Check the provisioner and volumeBindingMode before assuming dynamic provisioning works." },
        { title: "Check PVC binding", cmd: "kubectl get pvc -n <namespace>", note: "Pending usually means no matching PV, no provisioner, or a capacity/access-mode mismatch." },
        { title: "Inspect a PV's claim", cmd: "kubectl get pv <pv> -o jsonpath='{.spec.claimRef}'", note: "A PV bound to the wrong claim will not rebind until the claim reference is cleared." }
      ]
    },
    {
      id: "cka",
      label: "CKA workflow",
      blurb: "Fast, verifiable commands. Read the task twice, then check the result the way the grader will.",
      items: [
        { title: "Switch context", cmd: "kubectl config get-contexts\nkubectl config use-context <context>", note: "Do this before every task. The wrong context wastes the most time in the exam." },
        { title: "Set a short alias", cmd: "alias k=kubectl\nexport do='--dry-run=client -o yaml'", note: "Generate manifests with k run <name> --image=<img> $do > x.yaml, then edit and apply." },
        { title: "Query with jsonpath", cmd: "kubectl get pods -o jsonpath='{.items[*].metadata.name}'", note: "Quote the expression in shell. Add -n <namespace>; jsonpath does not infer context for you." },
        { title: "Sort by restart count", cmd: "kubectl get pods -A --sort-by=.status.containerStatuses[0].restartCount", note: "Inspect the pods at the end of the list first. A missing containerStatuses entry can break the sort." },
        { title: "Custom columns", cmd: "kubectl get pods -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeName,IP:.status.podIP'", note: "Cheaper to read than full YAML when you need two or three fields." },
        { title: "Back up etcd", cmd: "sudo ETCDCTL_API=3 etcdctl --endpoints=https://127.0.0.1:2379 \\\n  --cacert=/etc/kubernetes/pki/etcd/ca.crt \\\n  --cert=/etc/kubernetes/pki/etcd/server.crt \\\n  --key=/etc/kubernetes/pki/etcd/server.key \\\n  snapshot save /opt/etcd-backup.db", note: "Verify with snapshot status. Restore only with the same etcdctl version and a stopped API server plan." },
        { title: "Check certificate expiry", cmd: "sudo kubeadm certs check-expiration", note: "Renew with kubeadm certs renew all, then restart the control-plane static pods." },
        { title: "Print a join command", cmd: "sudo kubeadm token create --print-join-command", note: "Tokens are short-lived. Do not paste them into public notes." },
        { title: "Find the static pod path", cmd: "grep staticPodPath /var/lib/kubelet/config.yaml", note: "Manifests dropped there are owned by the kubelet; the API server shows them as mirror pods." },
        { title: "Inspect kubelet", cmd: "systemctl status kubelet\nsudo journalctl -u kubelet -n 100 --no-pager", note: "Most node NotReady cases surface here before they surface in kubectl." },
        { title: "Use crictl", cmd: "sudo crictl ps\nsudo crictl logs <container-id>", note: "The container runtime view still works when the API server or kubelet is unhealthy." },
        { title: "Drain and uncordon", cmd: "kubectl drain <node> --ignore-daemonsets --delete-emptydir-data\nkubectl uncordon <node>", note: "Drain evicts workloads. Confirm PodDisruptionBudgets and local storage before running it." }
      ]
    },
    {
      id: "ansible",
      label: "Ansible",
      blurb: "Check mode first, then converge. Idempotence is the point; a changed count of zero is a good result.",
      items: [
        { title: "Inspect inventory", cmd: "ansible-inventory -i inventory --list", note: "Confirms groups, host vars, and connection details before a play runs." },
        { title: "Ping every host", cmd: "ansible all -i inventory -m ping", note: "Tests SSH and Python, not application health. A pong only means Ansible can connect." },
        { title: "Ad-hoc command", cmd: "ansible all -i inventory -a 'uptime'", note: "Use -b for privilege escalation and -u to override the remote user." },
        { title: "Dry run a playbook", cmd: "ansible-playbook -i inventory playbook.yml --check --diff", note: "Not every module supports check mode, but the diff exposes most unintended changes." },
        { title: "Run a playbook", cmd: "ansible-playbook -i inventory playbook.yml", note: "Read the recap: changed counts are your idempotence signal." },
        { title: "Limit scope", cmd: "ansible-playbook -i inventory playbook.yml --limit web01 --tags packages", note: "Safer than editing the play just to test one host or task group." },
        { title: "Validate syntax", cmd: "ansible-playbook -i inventory playbook.yml --syntax-check", note: "Fast feedback before a long run; it does not validate module arguments." },
        { title: "List tasks", cmd: "ansible-playbook -i inventory playbook.yml --list-tasks", note: "Confirms tags and order without touching a host." },
        { title: "Read module docs", cmd: "ansible-doc ansible.builtin.copy", note: "Prefer fully qualified collection names in new playbooks." },
        { title: "Vault a secret", cmd: "ansible-vault encrypt secrets.yml\nansible-playbook -i inventory playbook.yml --ask-vault-pass", note: "Never commit the vault password. Use a password file or an external secret manager in automation." }
      ]
    },
    {
      id: "puppet",
      label: "Puppet",
      blurb: "Noop is not optional. Compile, inspect the diff, then enforce.",
      items: [
        { title: "Validate syntax", cmd: "puppet parser validate manifest.pp", note: "Catches syntax errors without applying anything." },
        { title: "Noop first", cmd: "sudo puppet apply --noop manifest.pp", note: "Shows the catalog changes Puppet would make. Read them before enforcing." },
        { title: "Apply a manifest", cmd: "sudo puppet apply manifest.pp", note: "Use --debug or --verbose when a resource fails and the summary is too terse." },
        { title: "Run the agent", cmd: "sudo puppet agent -t", note: "-t is --test: verbose, one-shot, and exits non-zero on failure. Do not leave it running in production." },
        { title: "Inspect a fact", cmd: "facter os.family\nfacter networking.interfaces", note: "Facts are the data your conditionals depend on; verify them on the target, not your laptop." },
        { title: "Inspect a resource", cmd: "sudo puppet resource package httpd", note: "With a desired state, puppet resource can also enforce it. Use noop-like care on live systems." },
        { title: "Describe a type", cmd: "puppet describe file", note: "Lists parameters and defaults for the resource type you are about to write." },
        { title: "Look up Hiera data", cmd: "puppet lookup <key> --node <node> --explain", note: "--explain shows which hierarchy level won. Essential when a value is not what you expected." },
        { title: "Show configuration", cmd: "puppet config print", note: "Confirms module path, environment, and hiera_config actually in use." }
      ]
    },
    {
      id: "security",
      label: "CKS security",
      blurb: "Scan the artifact before it reaches the cluster, then constrain what it can do.",
      items: [
        { title: "Scan an image", cmd: "trivy image --severity HIGH,CRITICAL <image>:<tag>", note: "Pin the image by digest so the scan matches what you deploy." },
        { title: "Scan a filesystem", cmd: "trivy fs --scanners vuln,secret,misconfig .", note: "Useful in CI to catch committed secrets and IaC misconfigurations before build." },
        { title: "Inspect pod security context", cmd: "kubectl get pod <pod> -o jsonpath='{.spec.containers[*].securityContext}'", note: "Confirm runAsNonRoot, readOnlyRootFilesystem, capabilities, and allowPrivilegeEscalation explicitly." },
        { title: "Check AppArmor status", cmd: "sudo aa-status", note: "Profiles must be loaded on the node. Modern Kubernetes uses securityContext.appArmorProfile." },
        { title: "Enforce Pod Security Standards", cmd: "kubectl label namespace <ns> pod-security.kubernetes.io/enforce=restricted", note: "Test with warn and audit first; restricted rejects pods that were previously admitted." },
        { title: "Review RBAC bindings", cmd: "kubectl get rolebindings,clusterrolebindings -A", note: "Look for wildcards, cluster-admin, and service accounts that do not need the access." },
        { title: "Check a service account", cmd: "kubectl auth can-i --list --as=system:serviceaccount:<ns>:<sa>", note: "This is the effective permission view; the YAML alone can hide inherited bindings." },
        { title: "List network policies", cmd: "kubectl get networkpolicy -A -o wide", note: "A default-deny policy plus explicit allows is the usual baseline. Confirm your CNI enforces it." },
        { title: "Verify a secret is not in Git", cmd: "git grep -nE '(password|token|secret)[[:space:]]*[:=]' -- . ':!*.md'", note: "A heuristic, not a scanner. Use a dedicated secret scanner in CI as the real gate." }
      ]
    }
  ];

  const state = { query: "", section: "all" };
  const els = {};

  function allItems() {
    return SECTIONS.flatMap((s) => s.items.map((i) => ({ ...i, section: s.id, sectionLabel: s.label })));
  }

  function matched(item) {
    if (state.section !== "all" && item.section !== state.section) return false;
    const tokens = state.query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return true;
    const hay = (item.title + " " + item.cmd + " " + item.note + " " + item.sectionLabel).toLowerCase();
    return tokens.every((t) => hay.includes(t));
  }

  function copyCommand(code, label) {
    KK.copy(code, label || "Command copied");
  }

  function renderChips() {
    els.chips.textContent = "";
    const options = [{ id: "all", label: "All", count: allItems().length }].concat(
      SECTIONS.map((s) => ({ id: s.id, label: s.label, count: s.items.length }))
    );
    for (const opt of options) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.setAttribute("aria-pressed", String(state.section === opt.id));
      b.innerHTML = KK.escapeHtml(opt.label) + ' <span class="chip-count">' + opt.count + "</span>";
      b.addEventListener("click", () => {
        state.section = opt.id;
        renderChips();
        render();
      });
      els.chips.appendChild(b);
    }
  }

  function render() {
    els.root.textContent = "";
    let visible = 0;

    for (const section of SECTIONS) {
      const items = section.items.filter((item) => matched({ ...item, section: section.id, sectionLabel: section.label }));
      if (!items.length) continue;
      visible += items.length;

      const sec = document.createElement("section");
      sec.className = "panel cheat-section";
      sec.id = "cheat-" + section.id;
      const head = document.createElement("div");
      head.className = "panel-head";
      head.innerHTML = "<h2>" + KK.escapeHtml(section.label) + '</h2><span class="explorer-count">' + items.length + "</span>";
      sec.appendChild(head);

      const blurb = document.createElement("p");
      blurb.className = "cheat-blurb";
      blurb.textContent = section.blurb;
      sec.appendChild(blurb);

      const grid = document.createElement("div");
      grid.className = "cheat-grid";
      for (const item of items) {
        const card = document.createElement("article");
        card.className = "cheat-item";

        const h = document.createElement("h3");
        h.textContent = item.title;
        card.appendChild(h);

        const line = document.createElement("div");
        line.className = "cmd-line";
        line.title = "Click to copy";

        const code = document.createElement("code");
        code.textContent = item.cmd;
        line.appendChild(code);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-mini";
        btn.setAttribute("aria-label", "Copy: " + item.title);
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>';
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          copyCommand(item.cmd, "Copied: " + item.title);
        });
        line.appendChild(btn);

        line.addEventListener("click", () => copyCommand(item.cmd, "Copied: " + item.title));
        card.appendChild(line);

        const note = document.createElement("p");
        note.className = "cheat-note";
        note.textContent = item.note;
        card.appendChild(note);

        grid.appendChild(card);
      }
      sec.appendChild(grid);
      els.root.appendChild(sec);
    }

    els.empty.hidden = visible > 0;
    els.visible.textContent = visible + " shown";
    els.count.textContent = String(allItems().length);
  }

  function wire() {
    els.search.addEventListener("input", KK.debounce(() => {
      state.query = els.search.value.trim();
      render();
    }, 80));

    document.addEventListener("keydown", (e) => {
      if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        els.search.focus();
      }
      if (e.key === "Escape" && document.activeElement === els.search && els.search.value) {
        els.search.value = "";
        state.query = "";
        render();
      }
    });
  }

  function init() {
    els.chips = $("#cheat-chips");
    els.root = $("#cheat-sections");
    els.empty = $("#cheat-empty");
    els.search = $("#cheat-search");
    els.count = $("#cheat-count");
    els.visible = $("#cheat-visible");
    renderChips();
    render();
    wire();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
