using System.ComponentModel.DataAnnotations;

namespace financeApp.Models;

public class Transacao
{
    public int Id { get; set; }

    // Enum no lugar de string
    [Required(ErrorMessage = "O tipo da transação é obrigatório.")]
    public TipoTransacao Tipo { get; set; }

    [Required(ErrorMessage = "A categoria é obrigatória.")]
    public int CategoriaId { get; set; }
    public Categoria? Categoria { get; set; }

    [Required(ErrorMessage = "O valor é obrigatório.")]
    [Range(0.01, double.MaxValue, ErrorMessage = "O valor deve ser maior que zero.")]
    public decimal Valor { get; set; }

    [Required(ErrorMessage = "A data é obrigatória.")]
    public DateTime Data { get; set; }

    public Transacao() { }

    public Transacao(TipoTransacao tipo, int categoriaId, decimal valor, DateTime data)
    {
        Tipo = tipo;
        CategoriaId = categoriaId;
        Valor = valor;
        Data = data;
    }
}
