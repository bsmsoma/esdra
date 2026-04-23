import { useAuth } from "../contexts/AuthContext";
import { getCustomerByUid, createOrUpdateCustomer } from "../firebase";
import { useEffect, useState } from "react";
import { Form, useActionData } from "react-router";
import { DeleteIcon, EditIcon } from "../assets/icons";
import styles from "./Addresses.module.scss";

export async function addressesAction({ request }) {
    const formData = await request.formData();
    const uid = formData.get("uid");
    const action = formData.get("action");

    try {
        const customer = await getCustomerByUid(uid);
        if (!customer) {
            return { error: "Cliente não encontrado" };
        }

        const addresses = customer.addresses || [];

        if (action === "add") {
            const newAddress = {
                id: Date.now().toString(),
                name: formData.get("name") || "",
                type: formData.get("type"),
                street: formData.get("street"),
                number: formData.get("number"),
                complement: formData.get("complement") || "",
                neighborhood: formData.get("neighborhood"),
                city: formData.get("city"),
                state: formData.get("state"),
                zipCode: formData.get("zipCode"),
                isDefault: addresses.length === 0,
            };
            addresses.push(newAddress);
        } else if (action === "edit") {
            const addressId = formData.get("addressId");
            const addressIndex = addresses.findIndex(function (addr) {
                return addr.id === addressId;
            });
            
            if (addressIndex !== -1) {
                addresses[addressIndex] = {
                    ...addresses[addressIndex],
                    name: formData.get("name") || "",
                    type: formData.get("type"),
                    street: formData.get("street"),
                    number: formData.get("number"),
                    complement: formData.get("complement") || "",
                    neighborhood: formData.get("neighborhood"),
                    city: formData.get("city"),
                    state: formData.get("state"),
                    zipCode: formData.get("zipCode"),
                };
            }
        } else if (action === "delete") {
            const addressId = formData.get("addressId");
            const filtered = addresses.filter(function (addr) {
                return addr.id !== addressId;
            });
            addresses.splice(0, addresses.length, ...filtered);
        } else if (action === "setDefault") {
            const addressId = formData.get("addressId");
            addresses.forEach(function (addr) {
                addr.isDefault = addr.id === addressId;
            });
        }

        await createOrUpdateCustomer(uid, {
            addresses: addresses,
        });

        return { success: true };
    } catch (error) {
        return { error: error.message };
    }
}

export default function Addresses() {
    const { user } = useAuth();
    const [customer, setCustomer] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState(null);
    const [cepLoading, setCepLoading] = useState(false);
    const [cepError, setCepError] = useState("");
    const actionData = useActionData();

    useEffect(function loadCustomer() {
        async function fetchCustomer() {
            if (user) {
                try {
                    const customerData = await getCustomerByUid(user.uid);
                    setCustomer(customerData);
                } catch (error) {
                    console.error("Erro ao carregar dados do cliente:", error);
                } finally {
                    setLoading(false);
                }
            }
        }
        fetchCustomer();
    }, [user, actionData]);

    // Close form after successful submission
    useEffect(function closeFormOnSuccess() {
        if (actionData?.success) {
            setShowAddForm(false);
            setEditingAddressId(null);
            setCepError("");
        }
    }, [actionData]);

    // Function to format CEP with mask (XXXXX-XXX)
    function formatCep(value) {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 5) return numbers;
        return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
    }

    // Function to fetch address from ViaCEP API
    async function handleCepChange(event) {
        const cep = event.target.value.replace(/\D/g, "");
        
        // Only fetch if CEP has 8 digits
        if (cep.length !== 8) {
            setCepError("");
            return;
        }

        setCepLoading(true);
        setCepError("");

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                setCepError("CEP não encontrado");
                setCepLoading(false);
                return;
            }

            // Auto-fill form fields
            document.getElementById("street").value = data.logradouro || "";
            document.getElementById("neighborhood").value = data.bairro || "";
            document.getElementById("city").value = data.localidade || "";
            document.getElementById("state").value = data.uf || "";

            // Focus on number field after auto-fill
            document.getElementById("number")?.focus();

            setCepLoading(false);
        } catch (error) {
            setCepError("Erro ao buscar CEP");
            setCepLoading(false);
        }
    }

    if (loading) {
        return <div className={styles.loading}>Carregando...</div>;
    }

    // Sort addresses to show default first
    const addresses = (customer?.addresses || []).sort(function(a, b) {
        if (a.isDefault) return -1;
        if (b.isDefault) return 1;
        return 0;
    });

    return (
        <div className={styles.addresses}>
            <div className={styles.header}>
                <h1 className={styles.title}>Meus Endereços</h1>
                <button
                    className={styles.addButton}
                    onClick={function () {
                        setShowAddForm(!showAddForm);
                    }}
                >
                    {showAddForm ? "Cancelar" : "+ Adicionar Endereço"}
                </button>
            </div>

            {actionData?.error && (
                <div className={styles.errorMessage}>{actionData.error}</div>
            )}

            {actionData?.success && (
                <div className={styles.successMessage}>Endereço atualizado com sucesso!</div>
            )}

            {showAddForm && (
                <Form method="post" className={styles.addressForm}>
                    <input type="hidden" name="uid" value={user.uid} />
                    <input type="hidden" name="action" value="add" />

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="name">Nome do Endereço:</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                placeholder="Ex: Casa da Mãe, Apartamento, Escritório..."
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="type">Tipo:</label>
                            <select id="type" name="type" required className={styles.input}>
                                <option value="home">Casa</option>
                                <option value="work">Trabalho</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="zipCode">CEP:</label>
                            <input
                                type="text"
                                id="zipCode"
                                name="zipCode"
                                required
                                maxLength="9"
                                placeholder="00000-000"
                                className={styles.input}
                                onChange={function(e) {
                                    e.target.value = formatCep(e.target.value);
                                    handleCepChange(e);
                                }}
                            />
                            {cepLoading && <span className={styles.cepStatus}>Buscando CEP...</span>}
                            {cepError && <span className={styles.cepError}>{cepError}</span>}
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="street">Rua:</label>
                            <input
                                type="text"
                                id="street"
                                name="street"
                                required
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="number">Número:</label>
                            <input
                                type="text"
                                id="number"
                                name="number"
                                required
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="complement">Complemento:</label>
                        <input
                            type="text"
                            id="complement"
                            name="complement"
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="neighborhood">Bairro:</label>
                        <input
                            type="text"
                            id="neighborhood"
                            name="neighborhood"
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="city">Cidade:</label>
                            <input
                                type="text"
                                id="city"
                                name="city"
                                required
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="state">Estado:</label>
                            <input
                                type="text"
                                id="state"
                                name="state"
                                required
                                maxLength="2"
                                placeholder="SP"
                                className={styles.input}
                            />
                        </div>
                    </div>

                    <button type="submit" className={styles.submitButton}>
                        Adicionar Endereço
                    </button>
                </Form>
            )}

            <div className={styles.addressesList}>
                {addresses.length === 0 ? (
                    <p className={styles.emptyState}>Nenhum endereço cadastrado</p>
                ) : (
                    addresses.map(function (address) {
                        const isEditing = editingAddressId === address.id;
                        
                        return (
                            <div key={address.id} className={styles.addressCard}>
                                {!isEditing ? (
                                    <>
                                        <div className={styles.addressHeader}>
                                            <h3>
                                                {address.name || (address.type === "home"
                                                    ? "Casa"
                                                    : address.type === "work"
                                                    ? "Trabalho"
                                                    : "Outro")}
                                                {address.isDefault && (
                                                    <span className={styles.defaultBadge}>Endereço Principal</span>
                                                )}
                                            </h3>
                                        </div>
                                        <p className={styles.addressText}>
                                            {address.street}, {address.number}
                                            {address.complement && ` - ${address.complement}`}
                                        </p>
                                        <p className={styles.addressText}>
                                            {address.neighborhood}, {address.city} - {address.state}
                                        </p>
                                        <p className={styles.addressText}>CEP: {address.zipCode}</p>
                                        <div className={styles.addressActions}>
                                            <button
                                                onClick={function() {
                                                    setEditingAddressId(address.id);
                                                    setShowAddForm(false);
                                                }}
                                                className={styles.actionButton}
                                            >
                                                <EditIcon />
                                                <span className={styles.buttonText}>Editar</span>
                                            </button>
                                            {!address.isDefault && (
                                                <Form method="post" className={styles.inlineForm}>
                                                    <input type="hidden" name="uid" value={user.uid} />
                                                    <input type="hidden" name="action" value="setDefault" />
                                                    <input type="hidden" name="addressId" value={address.id} />
                                                    <button type="submit" className={styles.actionButton}>
                                                        Definir como padrão
                                                    </button>
                                                </Form>
                                            )}
                                            <Form method="post" className={styles.inlineForm}>
                                                <input type="hidden" name="uid" value={user.uid} />
                                                <input type="hidden" name="action" value="delete" />
                                                <input type="hidden" name="addressId" value={address.id} />
                                                <button
                                                    type="submit"
                                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                                >
                                                    <DeleteIcon />
                                                    <span className={styles.buttonText}>Excluir</span>
                                                </button>
                                            </Form>
                                        </div>
                                    </>
                                ) : (
                                    <Form method="post" className={styles.editForm}>
                                        <input type="hidden" name="uid" value={user.uid} />
                                        <input type="hidden" name="action" value="edit" />
                                        <input type="hidden" name="addressId" value={address.id} />

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-name-${address.id}`}>Nome do Endereço:</label>
                                                <input
                                                    type="text"
                                                    id={`edit-name-${address.id}`}
                                                    name="name"
                                                    defaultValue={address.name}
                                                    placeholder="Ex: Casa da Mãe, Apartamento, Escritório..."
                                                    className={styles.input}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-type-${address.id}`}>Tipo:</label>
                                                <select 
                                                    id={`edit-type-${address.id}`} 
                                                    name="type" 
                                                    required 
                                                    defaultValue={address.type}
                                                    className={styles.input}
                                                >
                                                    <option value="home">Casa</option>
                                                    <option value="work">Trabalho</option>
                                                    <option value="other">Outro</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-zipCode-${address.id}`}>CEP:</label>
                                                <input
                                                    type="text"
                                                    id={`edit-zipCode-${address.id}`}
                                                    name="zipCode"
                                                    required
                                                    maxLength="9"
                                                    placeholder="00000-000"
                                                    defaultValue={address.zipCode}
                                                    className={styles.input}
                                                    onChange={function(e) {
                                                        e.target.value = formatCep(e.target.value);
                                                        handleCepChange(e);
                                                    }}
                                                />
                                                {cepLoading && <span className={styles.cepStatus}>Buscando CEP...</span>}
                                                {cepError && <span className={styles.cepError}>{cepError}</span>}
                                            </div>
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-street-${address.id}`}>Rua:</label>
                                                <input
                                                    type="text"
                                                    id="street"
                                                    name="street"
                                                    required
                                                    defaultValue={address.street}
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-number-${address.id}`}>Número:</label>
                                                <input
                                                    type="text"
                                                    id="number"
                                                    name="number"
                                                    required
                                                    defaultValue={address.number}
                                                    className={styles.input}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label htmlFor={`edit-complement-${address.id}`}>Complemento:</label>
                                            <input
                                                type="text"
                                                id="complement"
                                                name="complement"
                                                defaultValue={address.complement}
                                                className={styles.input}
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label htmlFor={`edit-neighborhood-${address.id}`}>Bairro:</label>
                                            <input
                                                type="text"
                                                id="neighborhood"
                                                name="neighborhood"
                                                required
                                                defaultValue={address.neighborhood}
                                                className={styles.input}
                                            />
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-city-${address.id}`}>Cidade:</label>
                                                <input
                                                    type="text"
                                                    id="city"
                                                    name="city"
                                                    required
                                                    defaultValue={address.city}
                                                    className={styles.input}
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label htmlFor={`edit-state-${address.id}`}>Estado:</label>
                                                <input
                                                    type="text"
                                                    id="state"
                                                    name="state"
                                                    required
                                                    maxLength="2"
                                                    placeholder="SP"
                                                    defaultValue={address.state}
                                                    className={styles.input}
                                                />
                                            </div>
                                        </div>

                                        <div className={styles.editFormActions}>
                                            <button type="submit" className={styles.submitButton}>
                                                Salvar Alterações
                                            </button>
                                            <button
                                                type="button"
                                                onClick={function() {
                                                    setEditingAddressId(null);
                                                    setCepError("");
                                                }}
                                                className={styles.cancelButton}
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </Form>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
