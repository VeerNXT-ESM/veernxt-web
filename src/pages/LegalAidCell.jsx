import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  stepLabels,
  profiles,
  services,
  profileFieldsConfig,
  legalCategories,
  situationsByCategory,
  legalFlows,
  genCaseRef,
  classifyFreeform,
  computeUrgency,
  recommendRoute,
  composeProfileLine,
} from '../lib/legalAidCellConfig';
import './LegalAidCell.css';

const initialState = {
  urgent: false,
  profile: 'ex_serviceman',
  service: 'Army',
  profileData: {},
  category: 'pension',
  situation: null,
  flowKey: null,
  skippedSituation: false,
  qa: {},
  docsChecked: {},
  caseRef: null,
};

const LegalAidCell = () => {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(1);
  const [state, setState] = useState(initialState);

  const patch = (updater) => setState((s) => ({ ...s, ...(typeof updater === 'function' ? updater(s) : updater) }));

  const ctx = useMemo(
    () => ({ qa: state.qa, profile: state.profile, category: state.category, situation: state.situation, profileData: state.profileData }),
    [state.qa, state.profile, state.category, state.situation, state.profileData]
  );

  const exitAssistance = () => navigate(-1);

  const go = (n) => {
    if ((n === 7 || n === 8) && !state.caseRef) patch({ caseRef: genCaseRef() });
    setCurrent(n);
    window.scrollTo(0, 0);
  };

  const selectChoiceUrgent = (isUrgent) => patch({ urgent: isUrgent });
  const selectProfile = (id) => patch({ profile: id, profileData: {} });
  const selectService = (value) => patch({ service: value });
  const setProfileField = (fieldId, value) => patch((s) => ({ profileData: { ...s.profileData, [fieldId]: value } }));
  const selectCategory = (id) => patch({ category: id });
  const selectSituation = (id, flow) => patch({ situation: id, flowKey: flow });

  const continueFromCategory = () => {
    if (state.category === 'unknown') {
      patch({ situation: 'unknown_freeform', flowKey: 'unknown_freeform', skippedSituation: true, qa: {}, docsChecked: {} });
      go(5);
    } else {
      patch({ skippedSituation: false });
      go(4);
    }
  };
  const continueFromSituation = () => {
    patch({ qa: {}, docsChecked: {} });
    go(5);
  };
  const backFromQuestions = () => go(state.skippedSituation ? 3 : 4);

  const answerSingle = (qid, value) => patch((s) => ({ qa: { ...s.qa, [qid]: value } }));
  const answerMulti = (qid, value, checked) =>
    patch((s) => {
      let arr = Array.isArray(s.qa[qid]) ? [...s.qa[qid]] : [];
      if (checked) {
        if (value === 'No') arr = ['No'];
        else {
          arr = arr.filter((v) => v !== 'No');
          arr.push(value);
        }
      } else {
        arr = arr.filter((v) => v !== value);
      }
      return { qa: { ...s.qa, [qid]: arr } };
    });
  const answerText = (qid, value) => patch((s) => ({ qa: { ...s.qa, [qid]: value } }));

  const isDocChecked = (doc) => (doc.id in state.docsChecked ? state.docsChecked[doc.id] : doc.defaultChecked !== false);
  const toggleDoc = (doc) => patch((s) => ({ docsChecked: { ...s.docsChecked, [doc.id]: !isDocChecked(doc) } }));

  const flow = state.flowKey ? legalFlows[state.flowKey] : null;

  return (
    <div className="legal-aid-cell">
      <main className="flow">
        <aside className="side">
          <button type="button" className="exit" onClick={exitAssistance}>× Exit assistance</button>
          <p className="eyebrow" style={{ color: '#e3c677', marginTop: 35 }}>Legal Sahayata</p>
          <h2>We will guide you,<br />one step at a time.</h2>
          <ol className="steps">
            {stepLabels.map((s, i) => (
              <li key={s} className={`${i + 1 === current ? 'active' : ''} ${i + 1 < current ? 'done' : ''}`}>
                <span className="num">{i + 1 < current ? '✓' : i + 1}</span>{s}
              </li>
            ))}
          </ol>
          <div className="privacy">🔒 Your information is private and can only be seen by authorised support personnel.</div>
        </aside>

        <section className="panel">
          <div className="mobileprogress">
            <span>STEP {current} OF {stepLabels.length}</span>
            <div className="bar"><span style={{ width: `${(current / stepLabels.length) * 100}%` }} /></div>
          </div>

          {current === 1 && (
            <div className="content">
              <div className="body">
                <p className="eyebrow">Safety first</p>
                <h1>Before we begin, is your matter urgent?</h1>
                <p className="intro">Please tell us if any of the following apply. This will help us arrange the right support without delay.</p>
                <ul style={{ margin: '14px 0 0', paddingLeft: 20, color: 'var(--muted)', lineHeight: 1.8, fontSize: 14 }}>
                  <li>You are in immediate danger</li>
                  <li>You are facing arrest or detention</li>
                  <li>You have a court hearing coming up</li>
                  <li>You have a deadline within the next 72 hours</li>
                  <li>You are experiencing active financial or cyber fraud</li>
                  <li>Any other situation needing immediate assistance</li>
                </ul>
                <div className="choices">
                  <button type="button" className={`choice ${!state.urgent ? 'selected' : ''}`} onClick={() => selectChoiceUrgent(false)}>
                    <span>🛡</span><strong>No, I am safe right now</strong><small>I can continue through the normal assistance steps.</small>
                  </button>
                  <button type="button" className={`choice danger ${state.urgent ? 'selected' : ''}`} onClick={() => selectChoiceUrgent(true)}>
                    <span>⚠</span><strong>Yes, this may be urgent</strong><small>There is danger, arrest, active fraud or an urgent deadline.</small>
                  </button>
                </div>
                {state.urgent && (
                  <div className="notice">
                    <strong>Please seek immediate help.</strong> Call 112 if you are in danger. For cyber financial fraud, call 1930. VeerNXT does not replace emergency services — you can still continue with the questions below so we can prepare your case, and we will flag it as urgent.
                  </div>
                )}
                <p className="intro" style={{ fontSize: 12 }}>🔒 Please do not upload classified, restricted, operational or security sensitive documents.</p>
              </div>
              <div className="actions">
                <span />
                <button type="button" className="next" onClick={() => go(2)}>Continue →</button>
              </div>
            </div>
          )}

          {current === 2 && (
            <div className="content">
              <div className="body">
                <p className="eyebrow">About you</p>
                <h1>What best describes your connection to the Armed Forces?</h1>
                <p className="intro">Your profile helps us understand which rules may apply and which specialist should review your matter.</p>
                <div className="pills">
                  {profiles.map((p) => (
                    <button key={p.id} type="button" className={`pill ${p.id === state.profile ? 'selected' : ''}`} onClick={() => selectProfile(p.id)}>{p.label}</button>
                  ))}
                </div>
                <b>Which service were you / your family member connected to?</b>
                <div className="servicegrid">
                  {services.map((s) => (
                    <button key={s} type="button" className={`servicebtn ${s === state.service ? 'selected' : ''}`} onClick={() => selectService(s)}>{s}</button>
                  ))}
                </div>
                <div className="fields">
                  {(profileFieldsConfig[state.profile] || []).map((f) =>
                    f.type === 'yesno' ? (
                      <div className="field" key={f.id}>
                        <label>{f.label}</label>
                        <div className="pills" style={{ margin: '8px 0 0' }}>
                          {['Yes', 'No', 'Not sure'].map((o) => (
                            <button key={o} type="button" className={`pill ${state.profileData[f.id] === o ? 'selected' : ''}`} onClick={() => setProfileField(f.id, o)}>{o}</button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <label className="field" key={f.id}>
                        {f.label}
                        <input type="text" placeholder={f.placeholder || ''} value={state.profileData[f.id] || ''} onChange={(e) => setProfileField(f.id, e.target.value)} />
                      </label>
                    )
                  )}
                </div>
                <div className="fields" style={{ marginTop: 15 }}>
                  <label className="field">State or Union Territory<input defaultValue="Uttarakhand" /></label>
                </div>
              </div>
              <div className="actions">
                <button type="button" className="back" onClick={() => go(1)}>← Back</button>
                <button type="button" className="next" onClick={() => go(3)}>Continue →</button>
              </div>
            </div>
          )}

          {current === 3 && (
            <div className="content">
              <div className="body">
                <p className="eyebrow">What happened</p>
                <h1>What happened?</h1>
                <p className="intro">Choose the situation that is closest to your concern. You don't need to know the legal term for it.</p>
                <div className="issuegrid">
                  {legalCategories.map((c) => (
                    <button key={c.id} type="button" className={`issue ${c.id === state.category ? 'selected' : ''}`} onClick={() => selectCategory(c.id)}>
                      <span style={{ fontSize: 22 }}>{c.icon}</span>
                      <span><b>{c.title}</b><small>{c.desc}</small></span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="actions">
                <button type="button" className="back" onClick={() => go(2)}>← Back</button>
                <button type="button" className="next" onClick={continueFromCategory}>Continue →</button>
              </div>
            </div>
          )}

          {current === 4 && (() => {
            const cat = legalCategories.find((c) => c.id === state.category);
            const list = situationsByCategory[state.category] || [];
            return (
              <div className="content">
                <div className="body">
                  <p className="eyebrow">{cat ? cat.title : 'Your situation'}</p>
                  <h1>What is happening?</h1>
                  <p className="intro">Select the option closest to your situation.</p>
                  <div className="issuegrid">
                    {list.map((s) => (
                      <button key={s.id} type="button" className={`issue ${s.id === state.situation ? 'selected' : ''}`} onClick={() => selectSituation(s.id, s.flow)}>
                        <b>{s.label}</b>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="back" onClick={() => go(3)}>← Back</button>
                  <button type="button" className="next" onClick={continueFromSituation}>Continue →</button>
                </div>
              </div>
            );
          })()}

          {current === 5 && flow && (() => {
            const isUnknown = state.flowKey === 'unknown_freeform';
            const sit = (situationsByCategory[state.category] || []).find((s) => s.id === state.situation);
            const heading = isUnknown ? "Tell us what happened, and we'll ask a few quick questions." : (sit ? sit.label : 'Just a few questions about your situation.');
            const showFraudBanner = ['cyber_fraud', 'financial_fraud', 'impersonation_fraud'].includes(state.situation);
            const visibleQuestions = flow.questions.filter((q) => !q.showIf || q.showIf(ctx));
            return (
              <div className="content">
                <div className="body">
                  <p className="eyebrow">A few questions</p>
                  <h1>{heading}</h1>
                  <p className="intro">Your answers help our Legal Support Desk understand what happened and prepare your case history. They do not amount to legal advice.</p>
                  {isUnknown && (
                    <label className="field">Tell us what happened
                      <textarea className="textarea" placeholder="For example: My pension was coming every month but stopped two months ago." value={state.qa.story || ''} onChange={(e) => answerText('story', e.target.value)} />
                    </label>
                  )}
                  {showFraudBanner && (
                    <div className="notice">If you are experiencing active cyber or financial fraud, call <strong>1930</strong> immediately or report at cybercrime.gov.in. This questionnaire helps prepare your case but does not replace that report.</div>
                  )}
                  {visibleQuestions.map((q) => (
                    <div className="qblock" key={q.id}>
                      <b>{q.prompt}</b>
                      {q.help && <p className="intro" style={{ fontSize: 12 }}>{q.help}</p>}
                      {q.type === 'single' && (
                        <div className="pills">
                          {q.options.map((o) => (
                            <button key={o} type="button" className={`pill ${state.qa[q.id] === o ? 'selected' : ''}`} onClick={() => answerSingle(q.id, o)}>{o}</button>
                          ))}
                        </div>
                      )}
                      {q.type === 'multi' && (
                        <div className="docs" style={{ border: 'none', paddingTop: 0, marginTop: 10 }}>
                          {q.options.map((o) => {
                            const arr = state.qa[q.id] || [];
                            return (
                              <label className="doc" key={o}>
                                <input type="checkbox" checked={arr.includes(o)} onChange={(e) => answerMulti(q.id, o, e.target.checked)} />{o}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      {q.type === 'text' && (
                        <label className="field" style={{ marginTop: 8 }}>
                          <input type="text" placeholder={q.placeholder || ''} value={state.qa[q.id] || ''} onChange={(e) => answerText(q.id, e.target.value)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
                <div className="actions">
                  <button type="button" className="back" onClick={backFromQuestions}>← Back</button>
                  <button type="button" className="next" onClick={() => go(6)}>Continue →</button>
                </div>
              </div>
            );
          })()}

          {current === 6 && flow && (() => {
            const docs = flow.documents.filter((d) => !d.showIf || d.showIf(ctx));
            return (
              <div className="content">
                <div className="body">
                  <p className="eyebrow">Documents</p>
                  <h1>Which documents do you have?</h1>
                  <p className="intro" style={{ fontSize: 12 }}>Select all that apply. Nothing is uploaded in this demonstration.</p>
                  <div className="docs" style={{ border: 'none', paddingTop: 0 }}>
                    {docs.length ? docs.map((d) => (
                      <label className="doc" key={d.id}>
                        <input type="checkbox" checked={isDocChecked(d)} onChange={() => toggleDoc(d)} />{d.label}
                      </label>
                    )) : <p className="intro">No specific documents are needed at this stage.</p>}
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="back" onClick={() => go(5)}>← Back</button>
                  <button type="button" className="next" onClick={() => go(7)}>Prepare my case summary →</button>
                </div>
              </div>
            );
          })()}

          {current === 7 && flow && (() => {
            const cat = legalCategories.find((c) => c.id === state.category);
            const sit = (situationsByCategory[state.category] || []).find((s) => s.id === state.situation);
            const profileLine = composeProfileLine(state);
            const concernParts = [cat ? cat.title : null, sit ? sit.label : (state.flowKey === 'unknown_freeform' ? 'Not yet classified' : null)].filter(Boolean);
            const visibleQs = flow.questions.filter((q) => !q.showIf || q.showIf(ctx));
            const qaEntries = visibleQs
              .map((q) => ({ q, v: state.qa[q.id] }))
              .filter(({ v }) => v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0));
            const storyLine = state.flowKey === 'unknown_freeform' && state.qa.story;
            const guessCategory = state.flowKey === 'unknown_freeform' ? classifyFreeform(state.qa.story) : null;
            const urgency = computeUrgency(state);
            const urgencyColor = urgency === 'Urgent' ? '#a44438' : (urgency === 'Priority review' ? '#8a6a1e' : '#1f3d29');
            const route = recommendRoute(state);
            const docs = flow.documents.filter((d) => !d.showIf || d.showIf(ctx));
            return (
              <div className="content">
                <div className="body">
                  <p className="eyebrow">Your case summary</p>
                  <h1>Here's what we understood.</h1>
                  <p className="intro">We have organised the information you provided into a simple assistance note. A qualified professional must examine your documents before giving advice.</p>
                  <div className="summarygrid">
                    <article className="summarybox">
                      <span className="tag">PRELIMINARY ASSISTANCE CLASSIFICATION</span>
                      <small>CASE REFERENCE</small><h3>{state.caseRef}</h3>
                      <div className="data">
                        <div><small>Your profile</small><b>{profileLine}</b></div>
                        <div><small>Your concern</small><b>{concernParts.join(' → ')}</b></div>
                        <div><small>Urgency</small><b style={{ color: urgencyColor }}>{urgency}</b></div>
                        <div><small>Recommended support route</small><b>{route}</b></div>
                      </div>
                      {guessCategory && (
                        <div className="greenbox"><b>Likely category</b><p>Based on what you told us, this may relate to <b>{guessCategory}</b>. A coordinator will confirm this.</p></div>
                      )}
                      {storyLine && (
                        <div className="greenbox"><b>What you told us</b><p>{state.qa.story}</p></div>
                      )}
                      {qaEntries.length > 0 && (
                        <div className="greenbox">
                          <b>What you told us</b>
                          {qaEntries.map(({ q, v }) => (
                            <div key={q.id}><small>{q.prompt}</small><b>{Array.isArray(v) ? v.join(', ') : v}</b></div>
                          ))}
                        </div>
                      )}
                    </article>
                    <div>
                      <article className="summarybox">
                        <h3>Documents to arrange</h3>
                        {docs.length ? docs.map((d) => <p key={d.id}>{isDocChecked(d) ? '✓' : '○'} {d.label}</p>) : <p>No specific documents needed at this stage.</p>}
                      </article>
                      <article className="summarybox source" style={{ marginTop: 14 }}>
                        <h3>Verified source approach</h3>
                        <p>This is a preliminary assistance classification, checked against approved service law, pension regulations and official sources where applicable. It is not legal advice, and no outcome is guaranteed.</p>
                      </article>
                    </div>
                  </div>
                  <div className="notice" style={{ background: '#fffaf0', borderColor: '#eed9ad', color: '#695a38' }}>
                    <strong>Important:</strong> Your answers suggest that this matter may require review by a qualified professional. Time limits may apply for appeals and representations — please do not delay professional review.
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="back" onClick={() => go(6)}>← Back</button>
                  <button type="button" className="next" onClick={() => go(8)}>Connect with support desk →</button>
                </div>
              </div>
            );
          })()}

          {current === 8 && (
            <Screen8 state={state} go={go} exitAssistance={exitAssistance} />
          )}
        </section>
      </main>
    </div>
  );
};

const Screen8 = ({ state, go, exitAssistance }) => {
  const [contactMethod, setContactMethod] = useState('phone');
  const [consent, setConsent] = useState(true);

  return (
    <div className="content">
      <div className="body">
        <p className="eyebrow">VeerNXT Legal Support Desk</p>
        <h1>How would you like us to contact you?</h1>
        <p className="intro">Case reference: <strong>{state.caseRef}</strong>. A Case Care Coordinator will speak with you, help organise your documents and connect you with a suitable legal professional. The coordinator will not give legal advice.</p>
        <div className="choices">
          <button type="button" className={`choice ${contactMethod === 'phone' ? 'selected' : ''}`} onClick={() => setContactMethod('phone')}>
            <span>☎</span><strong>Request a phone call</strong><small>Preferred time: Today, 4:00 to 6:00 PM</small>
          </button>
          <button type="button" className={`choice ${contactMethod === 'whatsapp' ? 'selected' : ''}`} onClick={() => setContactMethod('whatsapp')}>
            <span>◉</span><strong>Continue on WhatsApp</strong><small>Receive your case reference and secure instructions.</small>
          </button>
        </div>
        <label className="field" style={{ marginTop: 22 }}>Mobile number<input defaultValue="+91 98••• ••432" /></label>
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
          I consent to VeerNXT contacting me and sharing this case summary only with authorised support personnel or the legal professional assigned to me.
        </label>
        <button type="button" className="confirm" onClick={() => alert('This is a prototype. No callback request has been sent. Reference: ' + state.caseRef)}>Confirm callback request</button>
        <p className="prototype">🔒 This is only a prototype. No request is sent and no personal information is saved.</p>
      </div>
      <div className="actions">
        <button type="button" className="back" onClick={() => go(7)}>← Back</button>
        <button type="button" className="next" onClick={exitAssistance}>Finish</button>
      </div>
    </div>
  );
};

export default LegalAidCell;
