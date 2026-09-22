# Save token with WebGPU

### MODEL USE
#### Qwen3 0.6B params
**DEMO** on [https://tokensave.fenix.ninja](https://tokensave.fenix.ninja)

### Tech STACK
*   **Frontend**: **JavaScript (Vanilla)**, **CSS3**, **HTML5**, 
*   **Language Model**: **Qwen3 0.6B** (Local via WebGPU)
*   **Browser Technology**: **WebGPU**, **WebNN**, **Service Workers**, **IndexedDB**

### LAB 
**TEST 1**
 - [x] Using qwen3 for mapping vectors 
 - [x] Using cosine similarity for finding similar vectors 

**TEST 2**
One point vector embedding $\mathbf{u} \in \mathbb{R}^D$ generated for for model **Qwen3-Embedding** ($D = 1024$), normalize euclidian ($L_2$):

$$\hat{\mathbf{u}} = \frac{\mathbf{u}}{\|\mathbf{u}\|_2} = \frac{\mathbf{u}}{\sqrt{\sum_{i=1}^D u_i^2}}$$

For two normalized vectors $\hat{\mathbf{u}}$ and $\hat{\mathbf{v}}$, cosine similarity is reduced to dot product:

$$\text{sim}(\hat{\mathbf{u}}, \hat{\mathbf{v}}) = \cos(\theta) = \hat{\mathbf{u}} \cdot \hat{\mathbf{v}} = \sum_{i=1}^D \hat{u}_i \hat{v}_i$$ 

- [x] ¿can take decision? True
- [x] ¿can take choice? True 78% case [^1]

> [!NOTE]
> [^1] The embedding size is 1024 and the cosine similarity is calculated using the dot product of the normalized vectors. This is possible because the vectors are normalized to have a unit norm, so the dot product is equal to the cosine of the angle between the vectors.


